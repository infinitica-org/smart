"""CPU-first snapshot analysis: faces, head pose, unified object detection."""



from __future__ import annotations



import os

from dataclasses import dataclass

from typing import Optional



import cv2

import numpy as np

import onnxruntime as ort



YUNET_MODEL = os.environ.get(

    "PROCTORING_YUNET_MODEL", "/models/face_detection_yunet_2023mar.onnx"

)

YOLO_MODEL = os.environ.get("PROCTORING_YOLO_MODEL", "/models/yolov8n.onnx")

YAW_THRESHOLD = float(os.environ.get("PROCTORING_YAW_THRESHOLD", "25"))

PITCH_THRESHOLD = float(os.environ.get("PROCTORING_PITCH_THRESHOLD", "20"))

OBJECT_CONF = float(os.environ.get("PROCTORING_OBJECT_CONF", "0.45"))

OBSTRUCTED_LUMA = float(os.environ.get("PROCTORING_OBSTRUCTED_LUMA", "35"))

MIN_OBJECT_AREA_RATIO = float(os.environ.get("PROCTORING_MIN_OBJECT_AREA", "0.006"))



# COCO classes treated as suspicious in a single-face exam frame.

SUSPICIOUS_COCO_CLASSES = frozenset({0, 63, 65, 67, 73, 76})



MODEL_POINTS = np.array(

    [

        (0.0, 0.0, 0.0),

        (0.0, -330.0, -65.0),

        (-225.0, 170.0, -135.0),

        (225.0, 170.0, -135.0),

        (-150.0, -150.0, -125.0),

        (150.0, -150.0, -125.0),

    ],

    dtype=np.float64,

)





@dataclass

class AnalyzeResult:

    violations: list[str]

    yaw: float = 0.0

    pitch: float = 0.0

    face_count: int = 0





class SnapshotAnalyzer:

    def __init__(self) -> None:

        self._yunet: Optional[cv2.FaceDetectorYN] = None

        self._yolo: Optional[ort.InferenceSession] = None

        self._yolo_input = (640, 640)



    def _yunet_detector(self) -> cv2.FaceDetectorYN:

        if self._yunet is None:

            if not os.path.exists(YUNET_MODEL):

                raise FileNotFoundError(f"YuNet model missing: {YUNET_MODEL}")

            self._yunet = cv2.FaceDetectorYN.create(

                YUNET_MODEL,

                "",

                (320, 320),

                score_threshold=0.65,

                nms_threshold=0.35,

                top_k=5000,

            )

        return self._yunet



    def _load_yolo(self) -> Optional[ort.InferenceSession]:

        if self._yolo is None and os.path.exists(YOLO_MODEL):

            self._yolo = ort.InferenceSession(YOLO_MODEL, providers=["CPUExecutionProvider"])

        return self._yolo



    @staticmethod

    def _mean_luma(image: np.ndarray) -> float:

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        return float(np.mean(gray))



    @staticmethod

    def _box_iou(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:

        ax1, ay1, ax2, ay2 = a

        bx1, by1, bx2, by2 = b

        inter_x1 = max(ax1, bx1)

        inter_y1 = max(ay1, by1)

        inter_x2 = min(ax2, bx2)

        inter_y2 = min(ay2, by2)

        inter = max(0.0, inter_x2 - inter_x1) * max(0.0, inter_y2 - inter_y1)

        if inter <= 0:

            return 0.0

        area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)

        area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)

        union = area_a + area_b - inter

        return inter / union if union > 0 else 0.0



    def _detect_faces(self, image: np.ndarray) -> np.ndarray:

        detector = self._yunet_detector()

        h, w = image.shape[:2]

        detector.setInputSize((w, h))

        _, faces = detector.detect(image)

        if faces is None:

            return np.empty((0, 15))

        return faces



    def _estimate_pose(self, face_row: np.ndarray, image_shape: tuple[int, int, int]) -> tuple[float, float]:

        h, w = image_shape[:2]

        landmarks = np.array(

            [

                (face_row[4], face_row[5]),

                (face_row[6], face_row[7]),

                (face_row[8], face_row[9]),

                (face_row[10], face_row[11]),

                (face_row[12], face_row[13]),

                (face_row[4] + face_row[6], (face_row[5] + face_row[7]) / 2.0),

            ],

            dtype=np.float64,

        )

        camera_matrix = np.array(

            [[w, 0, w / 2.0], [0, w, h / 2.0], [0, 0, 1.0]],

            dtype=np.float64,

        )

        dist = np.zeros((4, 1))

        ok, rvec, _ = cv2.solvePnP(MODEL_POINTS, landmarks, camera_matrix, dist, flags=cv2.SOLVEPNP_ITERATIVE)

        if not ok:

            return 0.0, 0.0

        rot, _ = cv2.Rodrigues(rvec)

        sy = np.sqrt((rot[0, 0] ** 2) + (rot[1, 0] ** 2))

        pitch = np.degrees(np.arctan2(-rot[2, 0], sy))

        yaw = np.degrees(np.arctan2(rot[1, 0], rot[0, 0]))

        return float(yaw), float(pitch)



    def _detect_foreign_objects(self, image: np.ndarray, primary_face: Optional[np.ndarray]) -> bool:

        session = self._load_yolo()

        if session is None:

            return False

        h, w = image.shape[:2]

        frame_area = float(h * w)

        iw, ih = self._yolo_input

        resized = cv2.resize(image, (iw, ih))

        blob = resized.astype(np.float32) / 255.0

        blob = np.transpose(blob, (2, 0, 1))

        blob = np.expand_dims(blob, 0)

        input_name = session.get_inputs()[0].name

        outputs = session.run(None, {input_name: blob})

        if not outputs:

            return False

        pred = np.squeeze(outputs[0])

        if pred.ndim != 2:

            pred = np.transpose(pred)

        if pred.shape[0] < pred.shape[1]:

            pred = pred.T

        face_box: Optional[tuple[float, float, float, float]] = None

        if primary_face is not None:

            fx, fy, fw, fh = primary_face[0], primary_face[1], primary_face[2], primary_face[3]

            face_box = (fx, fy, fx + fw, fy + fh)

        scale_x, scale_y = w / iw, h / ih

        for row in pred:

            scores = row[4:]

            class_id = int(np.argmax(scores))

            conf = float(scores[class_id])

            if class_id not in SUSPICIOUS_COCO_CLASSES or conf < OBJECT_CONF:

                continue

            cx = row[0] * scale_x

            cy = row[1] * scale_y

            bw = row[2] * scale_x

            bh = row[3] * scale_y

            x1, y1 = cx - bw / 2, cy - bh / 2

            x2, y2 = cx + bw / 2, cy + bh / 2

            box_area = max(0.0, x2 - x1) * max(0.0, y2 - y1)

            if box_area / frame_area < MIN_OBJECT_AREA_RATIO:

                continue

            if face_box is not None:

                iou = self._box_iou(face_box, (x1, y1, x2, y2))

                if class_id == 0 and iou >= 0.35:

                    continue

                if class_id != 0 and iou >= 0.55:

                    continue

            return True

        return False



    def analyze_bytes(self, payload: bytes) -> AnalyzeResult:

        arr = np.frombuffer(payload, dtype=np.uint8)

        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if image is None:

            return AnalyzeResult(violations=[], face_count=0)



        violations: list[str] = []

        luma = self._mean_luma(image)

        faces = self._detect_faces(image)

        face_count = len(faces)

        yaw = pitch = 0.0

        primary = faces[0] if face_count > 0 else None



        if face_count > 1:

            violations.append("MULTIPLE_FACES")

        elif face_count == 0:

            violations.append("CAMERA_OBSTRUCTED" if luma < OBSTRUCTED_LUMA else "NO_FACE")

        else:

            assert primary is not None

            yaw, pitch = self._estimate_pose(primary, image.shape)

            if abs(yaw) > YAW_THRESHOLD or abs(pitch) > PITCH_THRESHOLD:

                violations.append("LOOKING_AWAY")

            if luma < 50:

                violations.append("POOR_LIGHTING")

            if self._detect_foreign_objects(image, primary):

                violations.append("FOREIGN_OBJECT_DETECTED")



        return AnalyzeResult(violations=violations, yaw=yaw, pitch=pitch, face_count=face_count)





_analyzer: Optional[SnapshotAnalyzer] = None





def get_analyzer() -> SnapshotAnalyzer:

    global _analyzer

    if _analyzer is None:

        _analyzer = SnapshotAnalyzer()

    return _analyzer


