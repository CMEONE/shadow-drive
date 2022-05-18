import * as anchor from "@project-serum/anchor";
import {
  getStakeAccount,
  findAssociatedTokenAddress,
  sendAndConfirm,
} from "../utils/helpers";
import { emissions, isBrowser, tokenMint } from "../utils/common";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { ShadowDriveResponse } from "../types";

/**
 *
 * @param {anchor.web3.PublicKey} key - Publickey of a Storage Account
 *
 * @returns {ShadowDriveResponse} - Confirmed transaction ID
 */
export default async function makeStorageImmutable(
  key: anchor.web3.PublicKey
): Promise<ShadowDriveResponse> {
  try {
    const selectedAccount = await this.program.account.storageAccount.fetch(
      key
    );
    const ownerAta = await findAssociatedTokenAddress(
      selectedAccount.owner1,
      tokenMint
    );
    const emissionsAta = await findAssociatedTokenAddress(emissions, tokenMint);
    let stakeAccount = (await getStakeAccount(this.program, key))[0];
    const txn = await this.program.methods
      .makeAccountImmutable()
      .accounts({
        storageConfig: this.storageConfigPDA,
        storageAccount: key,
        owner: selectedAccount.owner1,
        ownerAta,
        stakeAccount,
        emissionsWallet: emissionsAta,
        tokenMint: tokenMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .transaction();
    txn.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;
    txn.feePayer = this.wallet.publicKey;
    if (!isBrowser) {
      await txn.partialSign(this.wallet.payer);
    } else {
      await this.wallet.signTransaction(txn);
    }

    const res = await sendAndConfirm(
      this.provider.connection,
      txn.serialize(),
      { skipPreflight: false },
      "confirmed",
      120000
    );
    return Promise.resolve(res);
  } catch (e) {
    return Promise.reject(new Error(e));
  }
}
