import TribeVaultFactory from './TribeVaultFactory.json';
import TribePerformanceTracker from './TribePerformanceTracker.json';
import TribeUniswapV3Adapter from './TribeUniswapV3Adapter.json';
import TribeAerodromeAdapter from './TribeAerodromeAdapter.json';
import TribeCopyVault from './TribeCopyVault.json';
import TribeLeaderRegistry from './TribeLeaderRegistry.json';
import TribeLeaderboard from './TribeLeaderboard.json';
import TribeLeaderTerminal from './TribeLeaderTerminal.json';


export const LEADER_REGISTRY = "0xE73Eb839A848237E53988F0d74b069763aC38fE3";
export const VAULT_FACTORY = "0xdEc456e502CB9baB4a33153206a470B65Bedcf9E";
export const LEADER_TERMINAL = "0x5b9118131ff1F1c8f097828182E0560241CB9BA1";
export const LEADERBOARD = "0x730480562Af5D612e17D322a61140CF250bDB736";
export const PERFORMANCE_TRACKER = "0x79733De3CbD67A434469a77c7FACE852EC1ac8A1";
export const UNISWAP_V3_ADAPTER = "0x8b1192C386A778EBD27AB0317b81d1D9DB00CccA";

export const CONTRACT_ADDRESSES = {
  LEADER_REGISTRY,
  VAULT_FACTORY,
  LEADER_TERMINAL,
  LEADERBOARD,
  PERFORMANCE_TRACKER,
  UNISWAP_V3_ADAPTER,
};


export const ABIS = {
  TribeVaultFactory: TribeVaultFactory.abi,
  TribePerformanceTracker: TribePerformanceTracker.abi,
  TribeUniswapV3Adapter: TribeUniswapV3Adapter.abi,
  TribeCopyVault: TribeCopyVault.abi,
  TribeAerodromeAdapter: TribeAerodromeAdapter.abi,
  TribeLeaderRegistry: TribeLeaderRegistry.abi,
  TribeLeaderboard: TribeLeaderboard.abi,
  TribeLeaderTerminal: TribeLeaderTerminal.abi,
};

export default ABIS;
