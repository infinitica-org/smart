import { randomUUID } from 'node:crypto';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

const SIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * Generic object storage over MinIO's S3-compatible API. The first real
 * upload pipeline in this codebase — everything before this (work-experience
 * "documents", resume uploads) either stores metadata only or fabricates a
 * URL client-side. Kept feature-agnostic on purpose so it's reusable beyond
 * candidate certificates.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    forcePathStyle: true, // required for MinIO
    // Browser PUT uploads break when the presigner adds SDK checksum headers the client cannot match.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  /**
   * Self-healing guard: the docker-compose `minio-init` service provisions the
   * bucket for a fresh stack, but any dev running MinIO another way (a stale
   * volume, a manually-started container, a non-compose setup) would otherwise
   * hit a silent `NoSuchBucket` 500 on their first upload. Idempotent and cheap,
   * so it's safe to run on every boot rather than trusting infra alone.
   */
  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
        this.logger.log(`Created missing object storage bucket "${env.S3_BUCKET}".`);
      } catch (createError) {
        this.logger.error(
          `Object storage bucket "${env.S3_BUCKET}" is missing and could not be created automatically. Uploads will fail until it exists.`,
          createError instanceof Error ? createError.stack : String(createError),
        );
      }
    }
  }

  /** Uploads a buffer under a namespaced, collision-proof key and returns that key. */
  async upload(params: {
    buffer: Buffer;
    namespace: string;
    fileName: string;
    contentType: string;
  }): Promise<string> {
    const objectKey = `${params.namespace}/${randomUUID()}-${sanitizeFileName(params.fileName)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: objectKey,
        Body: params.buffer,
        ContentType: params.contentType,
      }),
    );
    return objectKey;
  }

  /** Time-limited GET URL — the bucket stays private, nothing is served publicly by default. */
  async getSignedDownloadUrl(objectKey: string): Promise<string> {
    const signed = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: objectKey }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
    return rewriteSignedUrlForBrowser(signed);
  }

  /** Presigned PUT for direct client upload (project defense audio, L3, etc.). */
  async getSignedUploadUrl(params: { objectKey: string; contentType: string }): Promise<string> {
    const commandInput: PutObjectCommandInput = {
      Bucket: env.S3_BUCKET,
      Key: params.objectKey,
      ContentType: params.contentType,
    };
    const signed = await getSignedUrl(this.client, new PutObjectCommand(commandInput), {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
    return rewriteSignedUrlForBrowser(signed);
  }

  /** Overwrites an object at a fixed key (idempotent defense artifacts, etc.). */
  async putObjectBuffer(params: {
    objectKey: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: params.objectKey,
        Body: params.buffer,
        ContentType: params.contentType,
      }),
    );
  }

  /** Downloads an object buffer by key. */
  async getObjectBuffer(objectKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: objectKey }),
    );
    const byteArray = await response.Body?.transformToByteArray();
    if (!byteArray) throw new Error(`Empty or missing object for key ${objectKey}`);
    return Buffer.from(byteArray);
  }

  /** Deletes an object by key (S3 delete is idempotent — missing keys succeed). */
  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: objectKey }));
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(-100);
}

/** Presigns against the internal endpoint; browsers need the public host (MinIO on localhost, R2 in prod). */
export function rewriteSignedUrlForBrowser(signedUrl: string): string {
  const publicBase = env.S3_PUBLIC_ENDPOINT?.trim() || env.S3_ENDPOINT;
  if (publicBase === env.S3_ENDPOINT) return signedUrl;

  const internal = new URL(env.S3_ENDPOINT);
  const pub = new URL(publicBase);
  return signedUrl.replace(
    `${internal.protocol}//${internal.host}`,
    `${pub.protocol}//${pub.host}`,
  );
}
