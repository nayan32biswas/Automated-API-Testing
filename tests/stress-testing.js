export const options = {
  stages: [
    { duration: "10s", target: 20 },
    { duration: "20s", target: 100 },
    { duration: "10s", target: 0 },
  ],
};

export default function () {
  testFunction();
}