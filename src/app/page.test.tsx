import React from "react";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the simulator console, upload action, and network graph", () => {
    render(<HomePage />);
    expect(screen.getByText("Virality Simulator")).toBeInTheDocument();
    expect(screen.getByText("Pre-Flight Content Evaluator")).toBeInTheDocument();
    expect(screen.getByText("Upload Media")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Prediction" })).toBeInTheDocument();
  });
});
