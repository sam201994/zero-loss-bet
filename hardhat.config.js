require("@nomicfoundation/hardhat-toolbox")
require("dotenv/config")

/** @type import('hardhat/config').HardhatUserConfig */

const { GOERLI_PRIVATE_KEY, ACCOUNT_PRIVATE_KEY } = process.env

module.exports = {
    networks: {
        hardhat: {
            forking: {
                url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_PRIVATE_KEY}`,
            },
            chainId: 31337,
        },
        goerli: {
            url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_PRIVATE_KEY}`,
            accounts: [ACCOUNT_PRIVATE_KEY],
        },
    },
    solidity: "0.8.18",
}
