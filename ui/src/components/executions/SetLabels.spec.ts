import {beforeEach, describe, expect, test, vi} from "vitest"
import {flushPromises} from "@vue/test-utils"
import {setActivePinia} from "pinia"
import {routedPinia} from "../../../tests/unit/memoryRouter"
import SetLabels from "./SetLabels.vue"
import {useExecutionsStore, type Execution} from "../../stores/executions"
import {i18nMount} from "../../../tests/unit/i18nMount"

const {toastSuccess, toastError} = vi.hoisted(() => ({
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}))

vi.mock("override/stores/auth", () => ({
    useAuthStore: () => ({user: {isAllowed: () => true}}),
}))

vi.mock("../../utils/toast", () => ({
    useToast: () => ({success: toastSuccess, error: toastError}),
}))

const messages = {
    "manage labels": "Manage labels",
    "Set labels": "Set labels",
    "cancel": "Cancel",
    "save": "Save",
    "close": "Close",
    "Set labels done": "Set labels done",
}

const globalConfig = {
    stubs: {
        KsPopover: {
            props: ["visible", "disabled"],
            emits: ["update:visible"],
            template: `
                <div>
                    <div data-test="reference" @click="!disabled && $emit('update:visible', true)">
                        <slot name="reference" />
                    </div>
                    <div v-if="visible" data-test="body"><slot /></div>
                </div>
            `,
        },
        KsButton: {template: "<button v-bind=\"$attrs\"><slot /></button>"},
        KsIconButton: {template: "<button v-bind=\"$attrs\"><slot /></button>"},
        LabelInput: {
            props: ["labels", "existingLabels"],
            emits: ["update:labels"],
            template: `
                <div>
                    <slot name="header" />
                    <button data-test="add-label" @click="$emit('update:labels', [...labels, {key: 'env', value: 'prod'}])">Add label</button>
                    <slot name="header-end" />
                </div>
            `,
        },
    },
}

function buildExecution(labels: {key: string; value: string}[] = [{key: "team", value: "a"}]): Execution {
    return {
        id: "execution-id",
        originalId: "execution-id",
        namespace: "io.kestra.tests",
        flowId: "flow",
        flowRevision: 1,
        labels,
        taskRunList: [],
        metadata: {
            originalCreatedDate: "2026-01-01T00:00:00Z",
            attemptNumber: 1,
        },
        state: {
            current: "SUCCESS",
            histories: [],
            getStartDate: "2026-01-01T00:00:00Z",
            getEndDate: "",
            getDuration: "PT1S",
        },
    } as Execution
}

function mountSetLabels(execution = buildExecution()) {
    return i18nMount(SetLabels, {
        messages,
        props: {execution},
        global: globalConfig,
    })
}

async function openAndSave(wrapper: ReturnType<typeof mountSetLabels>) {
    await wrapper.find(".set-labels-tag").trigger("click")
    await wrapper.get("[data-test=\"add-label\"]").trigger("click")
    const save = wrapper.findAll("button").find((button) => button.text() === "Save")
    expect(save).toBeDefined()
    await save!.trigger("click")
    await flushPromises()
}

describe("SetLabels", () => {
    beforeEach(() => {
        setActivePinia(routedPinia())
        toastSuccess.mockClear()
        toastError.mockClear()
    })

    test("shouldReloadExecutionAfterSavingLabelsSoOverviewShowsStoredLabels", async () => {
        const store = useExecutionsStore()
        const staleExecution = buildExecution()
        const freshExecution = buildExecution([
            {key: "team", value: "a"},
            {key: "env", value: "prod"},
        ])
        store.execution = staleExecution
        vi.spyOn(store, "setLabels").mockResolvedValue(staleExecution as never)
        const loadExecution = vi.spyOn(store, "loadExecution").mockImplementation(async () => {
            store.execution = freshExecution
            return freshExecution
        })

        await openAndSave(mountSetLabels())

        expect(store.setLabels).toHaveBeenCalledWith({
            labels: [
                {key: "team", value: "a"},
                {key: "env", value: "prod"},
            ],
            executionId: "execution-id",
        })
        expect(loadExecution).toHaveBeenCalledWith({id: "execution-id"})
        expect(store.execution?.labels).toEqual([
            {key: "team", value: "a"},
            {key: "env", value: "prod"},
        ])
        expect(toastSuccess).toHaveBeenCalledOnce()
        expect(toastError).not.toHaveBeenCalled()
    })
})
