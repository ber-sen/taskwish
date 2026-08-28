import { Int, Model } from "@taskwish/symbolic";
import { Actor, Step } from "taskwish";

const { actor } = Actor("Accounting").scope(
  Int(
    "grossRevenue",
    "refunds",
    "netRevenue",
    "costOfGoods",
    "operatingExpenses",
    "taxableIncome",
    "tax",
    "netIncome"
  ),

  Model(
    "incomeStatement",

    ({ grossRevenue, refunds, netRevenue }) =>
      netRevenue == grossRevenue - refunds,
    ({ netRevenue, costOfGoods, operatingExpenses, taxableIncome }) =>
      taxableIncome == netRevenue - costOfGoods - operatingExpenses,
    ({ taxableIncome, tax }) => tax == taxableIncome / 5,
    ({ taxableIncome, tax, netIncome }) => netIncome == taxableIncome - tax
  )
);

export const { forecast } = actor()
  .on("Command", "forecast")

  .run(
    Step("forecast", function () {
      return this.incomeStatement.prove({
        grossRevenue: 125000,
        refunds: 5000,
        costOfGoods: 45000,
        operatingExpenses: 25000,
      });
    })
  );

export const { Accounting } = actor().service({ forecast });
