function normalizeName(name: string) {
  return name.trim();
}

export async function runSteps(input: { name: string; }) {
  let firstStep: string;
  {
    firstStep = `Hello ${normalizeName(input.name)}`;
  }

  let lastStep: number;
  {
    lastStep = firstStep.length;
  }

  return lastStep;
}

const main = async () => {
  const result = await runSteps({ name: "hello" });

  console.log(result);
};

main();