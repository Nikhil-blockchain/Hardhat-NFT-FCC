const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random Ipfs Nfts Tests", () => {
          let randomNft, deployer, vrfCoordinatorV2Mock
          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["randomipfs", "mocks"]) // we deploy the deploy script by using the tags in the deploy script
              randomNft = await ethers.getContract("RandomIpfsNft")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          })

          describe("Constructor", () => {
              it("Initializes the Contract correctly", async () => {
                  const dogTokenUriZero = await randomNft.getDogTokenUris(0)
                  const initialized = await randomNft.getInitialized()
                  assert(dogTokenUriZero.includes("ipfs://"))
                  assert.equal(initialized, true)
              })
          })

          describe("Request Nft", () => {
              it("Fails if payment is not send with request", async () => {
                  await expect(randomNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETH"
                  )
              })
              it("Gets Mint Fee & Fails if enough ETH is not sent", async () => {
                  const mintFee = await randomNft.getMintFee()
                  assert.equal(mintFee.toString(), ethers.utils.parseEther("0.01").toString())
                  await expect(
                      randomNft.requestNft({ value: mintFee.sub(ethers.utils.parseEther("0.001")) }) //mintFee.sub will send that much ETH to the contract
                  ).to.be.revertedWith("RandomIpfsNft__NeedMoreETH")
              })
              it("Emits an event and calls random word request", async () => {
                  const mintFee = await randomNft.getMintFee()
                  await expect(randomNft.requestNft({ value: mintFee.toString() })).to.emit(
                      randomNft,
                      "NftRequested"
                  )
              })
          })

          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomNft.tokenURI("0")
                              const tokenCounter = await randomNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "0")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const fee = await randomNft.getMintFee()
                          const requestNftResponse = await randomNft.requestNft({
                              value: ethers.utils.parseEther("0.02"),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })

          describe("Get Breed From ModdedRng", () => {
              it("Should return Pug if moddedRng<10", async () => {
                  const result = await randomNft.getBreedFromModdedRng(5)
                  assert.equal(0, result)
              })
              it("Should return shiba inu if ModdedRng lies between 10 and 30", async () => {
                  const result = await randomNft.getBreedFromModdedRng(21)
                  assert.equal(1, result)
              })
              it("Should return st berard if ModdedRng>30", async () => {
                  const result = await randomNft.getBreedFromModdedRng(77)
                  assert.equal(2, result)
              })
              it("Should revert if ModdedRng is greater than 100", async () => {
                  await expect(randomNft.getBreedFromModdedRng(150)).to.be.revertedWith(
                      "RandomIpfsNft__RangeOutOfBounds"
                  )
              })
          })

          describe("Withdraw Only Owner", () => {
              it("Returns true if Owner equal to deployer", async () => {
                  const ownerAddress = await randomNft.getOwnerAddress()
                  assert.equal(ownerAddress.toString(), deployer.address)
              })
              it("Returns true if owner withdraws the fund", async () => {
                  const result = await randomNft.withdraw() //result will have true

                  assert(result.toString()) // we dont need equal here because result is true
              })
              it("Revert if Non-Owner tries to withdraw", async () => {
                  const user = accounts[1]
                  const userContract = await randomNft.connect(user)
                  expect(userContract.withdraw()).to.be.revertedWith(
                      "RandomIpfsNft__WithdrawUnsuccessful"
                  )
              })
          })
      })
