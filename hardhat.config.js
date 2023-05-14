require("@nomicfoundation/hardhat-toolbox")
require("dotenv/config")

// constants
const { GOERLI_PRIVATE_KEY, ACCOUNT_PRIVATE_KEY } = process.env
const constants = {
  hardhat: {
    BTC_USD_FEED_ADDRESS: "0xA39434A63A52E749F02807ae27335515BA4b07F7",
                LENDING_POOL_PROVIDER_ADDRESS: "0x5E52dEc931FFb32f609681B8438A51c675cc232d",
                AAVE_V2_ADDRESS: "0x3bd3a20Ac9Ff1dda1D99C0dFCE6D65C4960B3627",
                AAVE_ATOKEN_ADDRESS: "0x22404B0e2a7067068AcdaDd8f9D586F834cCe2c5"
  },
  goerli: {
      BTC_USD_FEED_ADDRESS: "0xA39434A63A52E749F02807ae27335515BA4b07F7",
                LENDING_POOL_PROVIDER_ADDRESS: "0x5E52dEc931FFb32f609681B8438A51c675cc232d",
                AAVE_V2_ADDRESS: "0x3bd3a20Ac9Ff1dda1D99C0dFCE6D65C4960B3627",
                AAVE_ATOKEN_ADDRESS: "0x22404B0e2a7067068AcdaDd8f9D586F834cCe2c5"
  }
};



module.exports = {
    networks: {
        hardhat: {
            forking: {
                url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_PRIVATE_KEY}`,
            },
            chainId: 31337,
            constants: constants.hardhat
        },
        goerli: {
            url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_PRIVATE_KEY}`,
            accounts: [ACCOUNT_PRIVATE_KEY],
            constants: constants.goerli
        },
    },
    solidity: "0.8.18",
}
