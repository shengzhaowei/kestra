import {beforeEach, describe, expect, it} from "vitest"
import {createPinia, setActivePinia} from "pinia"
import {i18nMount} from "../../../tests/unit/i18nMount"
import {useLayoutStore} from "../../stores/layout"
import Environment from "./Environment.vue"

const LONG_NAME = "OSS - Test environment QA"

beforeEach(() => {
    localStorage.clear()
})

describe("Environment", () => {
    it("shouldShowFullNameInTooltipWhenHoveringTheEnvironmentBox", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        useLayoutStore().setEnvName(LONG_NAME)

        const wrapper = i18nMount(Environment, {
            global: {plugins: [pinia]},
        })

        const tooltips = wrapper.findAllComponents({name: "KsTooltip"})
        expect(tooltips).toHaveLength(1)
        expect(tooltips[0].props("content")).toBe(LONG_NAME)
        expect(tooltips[0].find("#environment").exists()).toBe(true)
        expect(wrapper.find(".name").text()).toBe(LONG_NAME)
    })
})
