import {describe, test, expect} from "vitest"
import {flushPromises, type VueWrapper} from "@vue/test-utils"
import {onMounted, ref} from "vue"
import KsDataTable from "./KsDataTable.vue"
import KsTableColumn from "../KsTable/KsTableColumn.vue"
import {i18nMount} from "../../../../tests/units/i18nMount"

const SAMPLE_DATA = [
    {id: "flow-001", namespace: "company.team", status: "SUCCESS"},
    {id: "flow-002", namespace: "company.data", status: "RUNNING"},
    {id: "flow-003", namespace: "company.infra", status: "FAILED"},
]

type Load = {page: number; size: number; sort?: string}
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const lastLoad = (loads: Load[]): Load => loads[loads.length - 1]

/** The column headers that announce a sort, as `aria-sort` exposes it to assistive technology. */
const sortedColumns = (wrapper: VueWrapper) => Object.fromEntries(
    wrapper.findAll("th")
        .filter((th) => th.attributes("aria-sort"))
        .map((th) => [th.text(), th.attributes("aria-sort")]),
)

/**
 * Mounts a table the way Flows and Executions do: the sorted column is rendered
 * from the visible-columns list, which starts empty and is only filled in
 * `onMounted` (see `useTableColumns`), so the column arrives after the table
 * itself has mounted. `defaultSort` is the sort from the URL on a refresh.
 */
function mountWithLateColumn() {
    const loads: Load[] = []
    const wrapper = i18nMount({
        components: {KsDataTable, KsTableColumn},
        template: `
            <ks-data-table :data="data" :total="3" :loadData="loadData" :defaultSort="{prop: 'namespace', order: 'descending'}">
                <ks-table-column prop="id" label="ID" sortable="custom" :sortOrders="['ascending', 'descending']" />
                <ks-table-column v-for="col in visibleColumns" :key="col" :prop="col" :label="col" sortable="custom" :sortOrders="['ascending', 'descending']" />
            </ks-data-table>
        `,
        setup: () => {
            const visibleColumns = ref<string[]>([])
            onMounted(() => { visibleColumns.value = ["namespace"] })
            return {data: SAMPLE_DATA, loadData: async (p: Load) => { loads.push(p) }, visibleColumns}
        },
    })
    return {loads, wrapper}
}

describe("KsDataTable late sort column", () => {
    test("shows the URL sort on a column that only appears after mount", async () => {
        const {wrapper} = mountWithLateColumn()
        await flushPromises()
        await tick()

        expect(sortedColumns(wrapper)).toEqual({namespace: "descending"})
    })

    test("reverses the restored sort on the first click of its column", async () => {
        const {loads, wrapper} = mountWithLateColumn()
        await flushPromises()
        await tick()

        await wrapper.get("button[aria-label='Sort by namespace']").trigger("click")
        await tick()

        expect(sortedColumns(wrapper)).toEqual({namespace: "ascending"})
        expect(lastLoad(loads).sort).toBe("namespace:asc")
        expect(wrapper.findComponent(KsDataTable).emitted("sort-change")?.[0][0]).toMatchObject({prop: "namespace", order: "ascending"})
    })
})
