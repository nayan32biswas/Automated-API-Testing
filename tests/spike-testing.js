export const options = {
  stages: [
    { duration: "5s", target: 20 },
    { duration: "20s", target: 2000 },
    { duration: "5s", target: 0 },
  ],
};

export default function () {
  testFunction();
}
