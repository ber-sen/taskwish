import { Int, Model } from "@taskwish/symbolic";
import { Actor, Step } from "taskwish";

const { Accounting } = Actor("Accounting");

export const { forecast } = Accounting()
  .on("Command", "forecast")

  .run(
    Int(
      "grossRevenue",
      "refunds",
      "netRevenue",
      "costOfGoods",
      "operatingExpenses",
      "taxableIncome",
      "tax",
      "netIncome",
    ),

    Model(
      "incomeStatement",

      ({ grossRevenue, refunds, netRevenue }) =>
        netRevenue == grossRevenue - refunds,
      ({ netRevenue, costOfGoods, operatingExpenses, taxableIncome }) =>
        taxableIncome == netRevenue - costOfGoods - operatingExpenses,
      ({ taxableIncome, tax }) => tax == taxableIncome / 5,
      ({ taxableIncome, tax, netIncome }) => netIncome == taxableIncome - tax,
    ),

    Step("forecast", function () {
      return this.incomeStatement.solve({
        grossRevenue: 125000,
        refunds: 5000,
        costOfGoods: 45000,
        operatingExpenses: 25000,
      });
    }),
  );
