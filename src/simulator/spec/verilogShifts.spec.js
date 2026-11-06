import { describe, expect, it, vi } from "vitest";
import ShiftLeft from "../src/modules/verilogShiftLeft";
import ShiftRight from "../src/modules/verilogShiftRight";

// Exercise the real resolver without initializing the editor and its render loop.
vi.mock("../src/circuitElement", () => ({ default: class {} }));
vi.mock("../src/node", () => ({ default: class {}, findNode: vi.fn() }));
vi.mock("../src/simulationArea", () => ({
  simulationArea: { simulationQueue: { add: vi.fn() } },
}));

import { simulationArea } from "../src/simulationArea";

describe.each([
  ["left", ShiftLeft],
  ["right", ShiftRight],
])("Verilog %s shift", (direction, Element) => {
  it.each([
    [8, 8, 0x81, 0],
    [8, 8, 0x81, 1],
    [32, 32, 0x80000001, 1],
    [32, 32, 0xffffffff, 31],
    [8, 16, 0x81, 8],
    [32, 32, 1, 32],
    [32, 32, 0xffffffff, 33],
    [32, 32, 0xffffffff, 64],
    [32, 32, 0xffffffff, 0xffffffff],
  ])("shifts %i-bit input into %i-bit output: %i by %i", (width, outputWidth, input, shift) => {
    const element = Object.create(Element.prototype);
    element.bitWidth = width;
    element.outputBitWidth = outputWidth;
    element.inp1 = { value: input };
    element.shiftInp = { value: shift };
    element.output1 = { value: undefined };
    const value = BigInt(input);
    const amount = BigInt(shift);
    // Every supported signal is at most 32 bits; avoid allocating a huge BigInt.
    const shifted = shift >= 32 ? 0n : direction === "left" ? value << amount : value >> amount;
    const expected = Number(BigInt.asUintN(outputWidth, shifted));

    vi.mocked(simulationArea.simulationQueue.add).mockClear();
    element.resolve();

    expect(element.output1.value).toBe(expected);
    expect(simulationArea.simulationQueue.add).toHaveBeenCalledExactlyOnceWith(element.output1);
  });

  it.each(["inp1", "shiftInp"])("leaves output alone when %s is unresolved", (pin) => {
    const element = Object.create(Element.prototype);
    element.inp1 = { value: 1 };
    element.shiftInp = { value: 1 };
    element[pin].value = undefined;
    element.output1 = { value: 7 };
    vi.mocked(simulationArea.simulationQueue.add).mockClear();

    element.resolve();

    expect(element.output1.value).toBe(7);
    expect(simulationArea.simulationQueue.add).not.toHaveBeenCalled();
  });
});
