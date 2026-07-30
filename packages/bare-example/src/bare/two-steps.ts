function normalizeName(name: string) {
  return name.trim();
}

export async function runSteps(input: { name: string; }) {
  const firstStep = `Hello ${normalizeName(input.name)}`;

  const lastStep = firstStep.length;

  return lastStep;
}

const main = async () => {
  const result = await runSteps({ name: "hello" });

  console.log(result);
};

main();