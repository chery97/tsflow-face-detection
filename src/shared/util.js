/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as tf from '@tensorflow/tfjs-core';
import {showBackendConfigs} from './option_panel';
import {GREEN, NUM_KEYPOINTS, RED, STATE, TUNABLE_FLAG_VALUE_RANGE_MAP} from './params';

export function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function isMobile() {
  return isAndroid() || isiOS();
}

/**
 * Reset the target backend.
 *
 * @param backendName The name of the backend to be reset.
 */
async function resetBackend(backendName) {
  const ENGINE = tf.engine();
  if (!(backendName in ENGINE.registryFactory)) {
    if(backendName === 'webgpu') {
      alert('webgpu backend is not registered. Your browser may not support WebGPU yet. To test this backend, please use a supported browser, e.g. Chrome canary with --enable-unsafe-webgpu flag');
      STATE.backend = !!STATE.lastTFJSBackend ? STATE.lastTFJSBackend : 'tfjs-webgl';
      showBackendConfigs();
      return;
    } else {
      throw new Error(`${backendName} backend is not registered.`);
    }
  }

  if (backendName in ENGINE.registry) {
    const backendFactory = tf.findBackendFactory(backendName);
    tf.removeBackend(backendName);
    tf.registerBackend(backendName, backendFactory);
  }

  await tf.setBackend(backendName);
  STATE.lastTFJSBackend = `tfjs-${backendName}`;
}

/**
 * Set environment flags.
 *
 * This is a wrapper function of `tf.env().setFlags()` to constrain users to
 * only set tunable flags (the keys of `TUNABLE_FLAG_TYPE_MAP`).
 *
 * ```js
 * const flagConfig = {
 *        WEBGL_PACK: false,
 *      };
 * await setEnvFlags(flagConfig);
 *
 * console.log(tf.env().getBool('WEBGL_PACK')); // false
 * console.log(tf.env().getBool('WEBGL_PACK_BINARY_OPERATIONS')); // false
 * ```
 *
 * @param flagConfig An object to store flag-value pairs.
 */
export async function setBackendAndEnvFlags(flagConfig, backend) {
  if (flagConfig == null) {
    return;
  } else if (typeof flagConfig !== 'object') {
    throw new Error(
        `An object is expected, while a(n) ${typeof flagConfig} is found.`);
  }

  // Check the validation of flags and values.
  for (const flag in flagConfig) {
    // TODO: check whether flag can be set as flagConfig[flag].
    if (!(flag in TUNABLE_FLAG_VALUE_RANGE_MAP)) {
      throw new Error(`${flag} is not a tunable or valid environment flag.`);
    }
    if (TUNABLE_FLAG_VALUE_RANGE_MAP[flag].indexOf(flagConfig[flag]) === -1) {
      throw new Error(
          `${flag} value is expected to be in the range [${
              TUNABLE_FLAG_VALUE_RANGE_MAP[flag]}], while ${flagConfig[flag]}` +
          ' is found.');
    }
  }

  tf.env().setFlags(flagConfig);

  const [runtime, $backend] = backend.split('-');

  if (runtime === 'tfjs') {
    await resetBackend($backend);
  }
}

function distance(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

function calculateAngle(leftEye, rightEye) {
  const deltaY = rightEye.y - leftEye.y;
  const deltaX = rightEye.x - leftEye.x;
  return Math.atan2(deltaY, deltaX); // 라디안 값
}

/**
 * Draw the keypoints on the video.
 * @param ctx 2D rendering context.
 * @param faces A list of faces to render.
 * @param boundingBox Whether or not to display the bounding box.
 * @param showKeypoints Whether or not to display the keypoints.
 */
const img = new Image();
img.src = 'https://s3.ap-northeast-2.amazonaws.com/test-admin.geekstudio.kr/png-transparent-black-framed-aviator-style-sunglasses-illustration-aviator-sunglasses-sunglasses-lens-copyright-glasses-removebg-preview.png';
img.onload = () => {
  console.log("Image loaded successfully");
  // drawResults 함수 호출 등 필요한 동작 수행
};
// import * from './test.jpg'

img.onerror = (error) => {
  console.error("Failed to load image:", error);
};

export function drawResults(ctx, faces, boundingBox, showKeypoints) {
  faces.forEach((face) => {
    const keypoints =
        face.keypoints.map((keypoint) => [keypoint.x, keypoint.y]);

    // if (boundingBox) {
    //   ctx.strokeStyle = RED;
    //   ctx.lineWidth = 1;
    //
    //   const box = face.box;
    //   drawPath(
    //       ctx,
    //       [
    //         [box.xMin, box.yMin], [box.xMax, box.yMin], [box.xMax, box.yMax],
    //         [box.xMin, box.yMax]
    //       ],
    //       true);
    // }

    // if (showKeypoints) {
    //   ctx.fillStyle = GREEN;
    //
    //   for (let i = 0; i < NUM_KEYPOINTS; i++) {
    //     const x = keypoints[i][0];
    //     const y = keypoints[i][1];
    //
    //     ctx.beginPath();
    //     ctx.arc(x, y, 3 /* radius */, 0, 2 * Math.PI);
    //     ctx.fill();
    //
    //     if (img.complete) {
    //       ctx.drawImage(img, x - img.width / 2, y - img.height / 2, 6, 6); // 원하는 크기로 설정
    //     }
    //   }
    // }

    // 왼쪽 눈과 오른쪽 눈의 좌표 추출
    const leftEye = keypoints[1]; // 왼쪽 눈 (keypoint 배열에서 적절한 인덱스로 수정)
    const rightEye = keypoints[2]; // 오른쪽 눈 (keypoint 배열에서 적절한 인덱스로 수정)

    if (leftEye && rightEye) {
      // 두 눈 중심점 계산
      const centerX = (leftEye[0] + rightEye[0]) / 2;
      const centerY = (leftEye[1] + rightEye[1]) / 2;

      // 두 눈 사이 거리 계산
      const eyeDistance = Math.sqrt(
          Math.pow(rightEye[0] - leftEye[0], 2) +
          Math.pow(rightEye[1] - leftEye[1], 2)
      );

      // 안경 이미지의 크기와 위치 설정
      const glassesWidth = eyeDistance * 3; // 안경의 너비
      const glassesHeight = glassesWidth / 2; // 안경의 높이
      const glassesX = centerX - glassesWidth / 1.7; // 안경의 x 위치
      const glassesY = centerY - glassesHeight / 2; // 안경의 y 위치

      if (img.complete && img.naturalWidth > 0) {
        // 안경 이미지 그리기
        ctx.drawImage(img, glassesX, glassesY, glassesWidth, glassesHeight);
      } else {
        // 이미지 로드 실패 시 기본 점 그리기
        ctx.beginPath();
        ctx.arc(leftEye[0], leftEye[1], 3 /* radius */, 0, 2 * Math.PI);
        ctx.arc(rightEye[0], rightEye[1], 3 /* radius */, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    if (showKeypoints) {
      // // 오른쪽눈
      // for (let i = 0; i < 1; i++) {
      //   const x = keypoints[i][0];
      //   const y = keypoints[i][1];
      //
      //   if (img.complete && img.naturalWidth > 0) {
      //     // 이미지를 그립니다.
      //     ctx.drawImage(img, x, y, 20, 20);
      //   } else {
      //     // 이미지가 로드되지 않았을 경우 기본 점을 그립니다.
      //     ctx.beginPath();
      //     ctx.arc(x, y, 3 /* radius */, 0, 2 * Math.PI);
      //     ctx.fill();
      //   }
      // }

      // 왼쪽눈
      // for (let i = 1; i < 2; i++) {
      //   const x = keypoints[i][0];
      //   const y = keypoints[i][1];
      //
      //   // 이미지가 로드된 경우 이미지 그려줌
      //   if (img.complete && img.naturalWidth > 0) {
      //     ctx.drawImage(img, x/1.5, y / 1.18, 200, 100);
      //   } else {
      //     // 이미지가 로드되지 않았을 경우 기본 점을 그려줌
      //     ctx.beginPath();
      //     ctx.arc(x, y, 3 /* radius */, 0, 2 * Math.PI);
      //     ctx.fill();
      //   }
      // }

      // 코
      // for (let i = 2; i < 3; i++) {
      //   const x = keypoints[i][0];
      //   const y = keypoints[i][1];
      //
      //   if (img.complete && img.naturalWidth > 0) {
      //     // 이미지를 그립니다.
      //     ctx.drawImage(img, x/1.45, y / 1.4, 200, 100);
      //   } else {
      //     // 이미지가 로드되지 않았을 경우 기본 점을 그립니다.
      //     ctx.beginPath();
      //     ctx.arc(x, y, 3 /* radius */, 0, 2 * Math.PI);
      //     ctx.fill();
      //   }
      // }

      // 입
      // for (let i = 3; i < 4; i++) {
      //   const x = keypoints[i][0];
      //   const y = keypoints[i][1];
      //
      //   console.log(img.naturalWidth)
      //   if (img.complete && img.naturalWidth > 0) {
      //     // 이미지를 그립니다.
      //     ctx.drawImage(img, x, y, 20, 20);
      //   } else {
      //     // 이미지가 로드되지 않았을 경우 기본 점을 그립니다.
      //     ctx.beginPath();
      //     ctx.arc(x, y, 3 /* radius */, 0, 2 * Math.PI);
      //     ctx.fill();
      //   }
      // }
    }
  });
}
