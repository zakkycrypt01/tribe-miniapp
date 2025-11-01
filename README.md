# 🏛️ Tribe - Base Mini App for Social Trading

> A Farcaster Mini App built for Base that enables social copy trading within the Base ecosystem. Participating in Base Batch 002 Buildathon.

## 🌟 Overview

Tribe is a Mini App built for Base that integrates with Farcaster's social layer, combining DeFi copy trading with social features. Built using Base's onchain infrastructure and Farcaster Frames, it allows users to:
- Copy expert liquidity provision strategies on Uniswap V3 and Aerodrome - automatically mirror complex LP positions without understanding tick ranges or impermanent loss
- Track performance metrics of different trading strategies
- Participate in liquidity provision across multiple DEXs
- Monitor real-time portfolio performance

## 🏗️ Architecture

### Smart Contracts
- `TribeCopyVault.json`: Manages individual user vaults for strategy copying
- `TribeLeaderRegistry.json`: Tracks and manages strategy leaders
- `TribeLeaderboard.json`: Maintains performance rankings
- `TribePerformanceTracker.json`: Tracks strategy performance metrics
- `TribeVaultFactory.json`: Factory contract for deploying user vaults
- DEX Adapters:
  - `TribeAerodromeAdapter.json`
  - `TribeUniswapV3Adapter.json`

### Mini App Components
- Built as a Farcaster Frame using Neynar SDK
- React/Next.js based frontend with TypeScript
- Tailwind CSS for styling
- Shadcn/UI components for consistent design
- Wagmi for Base interaction
- Deep integration with Base infrastructure
- Farcaster social features and Frames
- Base Name Service integration for user profiles

## 🚀 Features

### For Traders
- Create and share trading strategies
- Earn performance fees from followers
- Track portfolio performance
- Manage liquidity positions across DEXs

### For Users
- Copy successful traders automatically
- Real-time performance tracking
- Portfolio management dashboard
- Multi-token deposits support
- Automated position management

## 💻 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Shadcn/UI
- **Blockchain**: Base sepolia Network
- **Web3 Integration**: Wagmi, Viem
- **Development**: 
  - Node.js
  - pnpm (Package Manager)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/zakkycrypt01/tribe-miniapp.git
cd tribe-miniapp
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Required environment variables:
```env
KV_REST_API_TOKEN=''
KV_REST_API_URL=''
NEXT_PUBLIC_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

USE_TUNNEL="false"
NEXT_PUBLIC_ETHERSCAN_API_KEY=
```

4. Run development server:
```bash
npm dev
```

5. Open Base Mini App:
- Install Base wallet extension
- Visit the app in Base browser
- Connect with Farcaster

## 🌐 Deployment

The application is deployed on Vercel and can be accessed at [tribe-miniapp.vercel.app](https://tribev1.vercel.app)

## 🔗 Smart Contract Addresses (Base sepolia Network)

```typescript
USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
WETH: "0x4200000000000000000000000000000000000006"
WBTC: "0xcbB7C0006F23900c38EB856149F799620fcb8A4a"
UNI: "0xB62b54F9b13F3bE72A65117a705c930e42563ab4"
```

## 📝 Base Batch 002 Buildathon Submission

### Project Goals
1. Create a seamless Base Mini App experience for copy trading
2. Integrate deeply with Base infrastructure and Base Name Service
3. Build a social-first DeFi experience using Farcaster Frames
4. Create a trustless, automated copy trading platform
2. Leverage Base's low fees for efficient DeFi strategy execution
3. Integrate social features through Farcaster
4. Provide transparent performance tracking

### Key Innovations
- Automated strategy copying through smart contracts
- Social-first approach to DeFi trading
- Multi-DEX liquidity management
- Performance-based incentive structure

### Future Roadmap
- Advanced risk management features
- Additional DEX integrations
- Enhanced social features
- Mobile app development

## ⚠️ Disclaimer

This project is in development and submitted as part of Base Batch 002 Buildathon. Use at your own risk. Smart contracts are unaudited.

## 👥 Team

- [@zakkycrypt01](https://github.com/zakkycrypt01) - Project Lead & Development

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

