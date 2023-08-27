export const options = {
  stages: [
    { duration: "5s", target: 20 },
    { duration: "20s", target: 200 },
    { duration: "30s", target: 200 },
    { duration: "5s", target: 100 },
    { duration: "5s", target: 0 },
  ],
};

export default function () {
  testFunction();
}
