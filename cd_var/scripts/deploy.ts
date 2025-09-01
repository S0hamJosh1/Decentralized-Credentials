import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Deploy", (m) => {
  // Your contract class name from contracts/MinimalRegistry.sol
  const main = m.contract("MinimalRegistry"); 
  return { main };
});
