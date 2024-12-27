# **Packaging Order Quantities in a Constrained environment**
KRR Project
Jan Shah 
Nezar Krawa
Amrith B
# Key Elements of the Problem
## State Variables
These represent the system's current condition
- Box Prices - 
Pricing tiers for bulk discounts.
- Total Boxes Used - 
Average or cumulative over the time horizon.
- Average Cost per Unit - 
Derived from purchase orders.
- Time Horizon - 
Number of weeks the algorithm should optimise for.

## Decision Variables
These are controllable elements that influence the outcomes
- Order Quantities for Each Packaging Type - 
How much of each packaging size to order.
- Frequency of Orders - 
Weekly, monthly, or otherwise.
- Budget Allocation - 
How much to spend on each order.

## Exogenous Information
External factors affecting the system
- Delivery Delays - 
Random chance or seasonal.
- Seasonal Demand - 
Demand peaks and troughs over time.
- Store Growth - 
Gradual increases in overall demand.

## Transition Function
Defines how the state evolves
- Packaging Usage - 
Dependent on order volume.
- Inventory Levels - 
Update as new packaging is received.
- Budget Updates - 
Adjusted after purchases.

## Objective Function
This quantifies the goal
- Minimise Cost per Unit - 
Optimise bulk discounts.
- Maximise Order Fulfilment - 
Avoid stockouts while staying within space constraints.
- Balance Space and Budget - 
Maintain inventory within available warehouse capacity.

---

# Algorithms
## A. Bayesian Model
- Purpose - 
Predict optimal order sizes by iteratively improving accuracy with incoming data.
- How it Works
  - Define prior distributions for packaging demand based on historical data.
  - Use observed data (e.g., seasonal trends) to update these priors into posterior distributions.
  - Generate probabilistic predictions for future demand.


## B. Economic Order Quantity (EOQ)
- Purpose* - 
Calculate optimal order quantities to minimise total costs (holding + ordering).
- Formula
  - \[ EOQ = \sqrt{\frac{2DS}{H}} \]
  - \( D \)- Demand (e.g., mean packaging usage per time unit).
  - \( S \)- Ordering cost per order.
  - \( H \)- Holding cost per unit per time unit.


## C. Knapsack Problem
- Purpose - 
 Optimise packaging inventory within space constraints.
- How it Works
  - Items: Packaging sizes with associated costs and space requirements.
  - Capacity: Warehouse space available.
  - Solve for the maximum "value" (minimised cost) without exceeding space.

## D. Grey Wolf Optimizer (GWO)
- Purpose - 
Metaheuristic optimisation technique for nonlinear problems.
- How it Works
  - Simulates wolf pack behaviour for hunting.
  - Iteratively updates solutions (wolf positions) based on alpha, beta, and delta wolves (best solutions).
  - Converges on an optimal solution over iterations.
---

# Implementation Outline
## Define Parameters
- Inputs
  - Pricing tiers.
  - Historical demand data (simulated).
  - Space and budget constraints.
- Outputs
  - Optimised order quantities for each packaging type.

## Develop Core Functions
- State Update Function
  - Updates inventory and budget after each purchase.
- Cost Function
  - Calculates cost per unit based on order quantities and discounts.
- Constraint Check
  - Ensures orders respect space and budget limits.

# Implement Algorithm
- Bayesian Model
  - Represent prior demand as arrays.
  - Update distributions iteratively.
- EOQ
  - Calculate optimal quantities using demand and cost inputs.
- Knapsack
  - Use a nested loop for item selection or a recursive function for dynamic programming.
- GWO
  - Initialise wolf positions randomly.
  - Iteratively update positions using fitness functions.

#### Simulation and Analysis
- Simulate packaging orders over a time horizon.
- Record and analyse results (e.g., cost savings, space usage).

---