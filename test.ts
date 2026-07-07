const getData = async function* () {
  yield "asdasd";
  yield "lorem";
  await Bun.sleep(3);
  yield "lorem";
  yield "lorem";
  yield "lorem";
  yield "lorem";
};

const getSomeOtherData = async function* () {
  yield "ipsum";
  await Bun.sleep(3);
  yield "ipsum";
  yield "ipsum";
  yield "ipsum";
  yield "ipsum";
};

async function* uppercase<T extends string>(
  input: AsyncIterable<T>,
): AsyncGenerator<T> {
  for await (const chunk of input) {
    yield chunk.toUpperCase();
  }
}

async function* run() {
  const steps = [];
  const a = getData();
  steps.push(a);

  return yield* steps[0];
}

async function* run1() {
  const steps = [];
  const a = getData();
  steps.push(a);
  const b = uppercase(a)
  steps[0] = b;

  return yield* steps[0];
}

async function* run2() {
  const steps = [];
  const a = getData();
  steps.push(a);
  const b = uppercase(a)
  steps[0] = b;
  const c = 3;
  steps.push(c);

  yield* steps[0];

  return steps[1];
}

async function* run3() {
  const steps = [];
  const a = getData();
  steps.push(a);
  const b = getSomeOtherData();
  steps.push(b);
  const c = 3;
  steps.push(c);

  yield* steps[0];
  yield* steps[1];

  return steps[2];
}
