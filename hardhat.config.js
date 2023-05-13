require("@nomicfoundation/hardhat-toolbox");
require( "dotenv/config");

const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
	networks: {
		hardhat: {
			forking: {
				url: `https://eth-goerli.g.alchemy.com/${GOERLI_PRIVATE_KEY}`
			}
		},
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/${GOERLI_PRIVATE_KEY}`,
      accounts: {
        mnemonic: "YOUR_METAMASK_MNEMONIC",
      },
    },
  },
  solidity: "0.8.18",
};

