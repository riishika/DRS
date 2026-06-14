import React from "react";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the simulator console, upload action, and network graph", () => {
    render(<HomePage />);
    expect(screen.getByText("Virality Simulator Console")).toBeInTheDocument();
    expect(screen.getByText("Uploaded Video")).toBeInTheDocument();
    expect(screen.getByText("Persona Propagation Map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Prediction" })).toBeInTheDocument();
  });
});
