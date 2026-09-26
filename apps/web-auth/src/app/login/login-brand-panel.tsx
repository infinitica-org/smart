'use client';

import Image from 'next/image';
import loginImg from '@smart/ui/assets/images/Logos/WebP/login-img.png';

export function LoginBrandPanel() {
  return (
    <section
      className="relative hidden h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-[28px] px-10 py-10 lg:flex xl:px-12"
      style={{ background: 'var(--background)' }}
      aria-label="About SMART"
    >
      <Image
        src={loginImg}
        alt="SMART candidate"
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

      <h1 className="font-heading relative z-10  text-[4.25rem] font-extrabold uppercase leading-[0.92] tracking-tight text-white xl:text-[5.25rem]">
        Get
        <br />
        Ready
        <br />
        Get Hired
      </h1>
    </section>
  );
}

// mt-auto
