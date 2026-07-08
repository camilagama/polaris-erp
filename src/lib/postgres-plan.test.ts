import { describe, expect, it } from "vitest";
import { collectPlanIndexNames, planUsesAnyIndex } from "@/lib/postgres-plan";

describe("postgres plan helpers", () => {
  it("collects index names from nested plan nodes", () => {
    expect(
      collectPlanIndexNames({
        "Node Type": "Nested Loop",
        Plans: [
          {
            "Index Name": "products_active_list_idx",
            "Node Type": "Index Scan",
          },
          {
            "Node Type": "Bitmap Heap Scan",
            Plans: [
              {
                "Index Name": "categories_organization_id_unique_idx",
                "Node Type": "Bitmap Index Scan",
              },
            ],
          },
        ],
      })
    ).toEqual([
      "categories_organization_id_unique_idx",
      "products_active_list_idx",
    ]);
  });

  it("detects whether a plan uses one of the expected indexes", () => {
    expect(
      planUsesAnyIndex(
        {
          "Node Type": "Limit",
          Plans: [
            {
              "Index Name": "sales_organization_occurred_on_created_at_id_idx",
              "Node Type": "Index Scan",
            },
          ],
        },
        ["sales_organization_occurred_on_created_at_id_idx"]
      )
    ).toBe(true);
  });
});
