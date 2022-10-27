const { assert } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")
const { network, deployments, ethers } = require("hardhat")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT unit Tests", () => {
          let basicNft, deployer, user

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]
              await deployments.fixture(["BasicNft"])
              basicNft = await ethers.getContract("BasicNft")
              userNft = basicNft.connect(user)
          })

          describe("Constructor", () => {
              it("initializes the constructor properly", async () => {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenNumber = await basicNft.getTokenCounter()
                  assert.equal(name, "Doggie")
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenNumber.toString(), "0")
              })
          })

          describe("Mint Nft", () => {
              beforeEach(async () => {
                  const tx = await userNft.mintNft()
                  await tx.wait(1)
              })
              it("Allows users to mint an NFT and updates accordingly", async () => {
                  const tokenURI = await userNft.tokenURI(0)
                  const tokenCounter = await userNft.getTokenCounter()

                  assert.equal(tokenURI, await userNft.TOKEN_URI())
                  assert.equal(tokenCounter.toString(), "1")
              })
              it("Show the correct balance and owner of an NFT", async function () {
                  const userAddress = user.address
                  const userBalance = await userNft.balanceOf(userAddress)
                  const owner = await userNft.ownerOf("0")

                  assert.equal(userBalance.toString(), "1")
                  assert.equal(owner, userAddress)
              })
          })
      })
