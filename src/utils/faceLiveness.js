const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

const eyeAspectRatio = (eye) => {
  const width = distance(eye[0], eye[3]);
  if (!width) return 1;
  return (distance(eye[1], eye[5]) + distance(eye[2], eye[4])) / (2 * width);
};

export const createFaceLivenessChallenge = () => ({
  openEyeRatio: null,
  baselineYaw: null,
  blinkClosed: false,
  turnMoved: false,
  complete: false,
});

export const advanceFaceLivenessChallenge = (challenge, landmarks) => {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();
  const eyeRatio = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
  const eyeCenter = (leftEye[0].x + leftEye[3].x + rightEye[0].x + rightEye[3].x) / 4;
  const eyeWidth = (distance(leftEye[0], leftEye[3]) + distance(rightEye[0], rightEye[3])) / 2;
  const noseCenter = nose.reduce((total, point) => total + point.x, 0) / nose.length;
  const yaw = eyeWidth ? (noseCenter - eyeCenter) / eyeWidth : 0;

  if (challenge.complete) return { complete: true, status: "Live check passed. Select Enroll face to save." };

  if (challenge.openEyeRatio === null && eyeRatio > 0.08) {
    challenge.openEyeRatio = eyeRatio;
    challenge.baselineYaw = yaw;
    return { complete: false, status: "Live check: blink once OR turn your head to either side, then face forward." };
  }

  if (challenge.openEyeRatio === null) {
    return { complete: false, status: "Live check: move closer and look toward the camera." };
  }

  challenge.openEyeRatio = Math.max(challenge.openEyeRatio, eyeRatio);
  if (eyeRatio < challenge.openEyeRatio * 0.72) challenge.blinkClosed = true;
  const blinkPassed = challenge.blinkClosed && eyeRatio > challenge.openEyeRatio * 0.8;

  if (Math.abs(yaw - challenge.baselineYaw) > 0.1) challenge.turnMoved = true;
  const turnPassed = challenge.turnMoved && Math.abs(yaw - challenge.baselineYaw) < 0.07;

  if (blinkPassed || turnPassed) {
    challenge.complete = true;
    return { complete: true, status: "Live check passed. Select Enroll face to save." };
  }

  return { complete: false, status: "Live check: blink once OR turn your head to either side, then face forward." };
};