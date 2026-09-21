FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /models \
    && curl -fsSL -o /models/face_detection_yunet_2023mar.onnx \
      https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx \
    && curl -fsSL -o /tmp/yolov8n.pt \
      https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt \
    && pip install --no-cache-dir ultralytics \
    && yolo export model=/tmp/yolov8n.pt format=onnx imgsz=640 opset=12 \
    && mv /tmp/yolov8n.onnx /models/yolov8n.onnx \
    && rm -f /tmp/yolov8n.pt

COPY . .

ENV PROCTORING_CV_PROVIDER=real \
    PROCTORING_YUNET_MODEL=/models/face_detection_yunet_2023mar.onnx \
    PROCTORING_YOLO_MODEL=/models/yolov8n.onnx

EXPOSE 8091
CMD ["python", "server.py"]
