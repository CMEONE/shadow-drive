import * as anchor from "@project-serum/anchor";
import { isBrowser, tokenMint } from "../utils/common";
import { ShadowDriveResponse } from "../types";
import { sendAndConfirm } from "../utils/helpers";

/**
 *
 * @param {anchor.web3.PublicKey} key - PublicKey of a StorageAccount
 *
 * @returns {ShadowDriveResponse} - Confirmed transaction ID
 */

export default async function deleteStorageAccount(
  key: anchor.web3.PublicKey
): Promise<ShadowDriveResponse> {
  const selectedAccount = await this.program.account.storageAccount.fetch(key);
  try {
    const txn = await this.program.methods
      .requestDeleteAccount()
      .accounts({
        storageConfig: this.storageConfigPDA,
        storageAccount: key,
        owner: selectedAccount.owner1,
        tokenMint: tokenMint,
        systemProgram: anchor.web3.SystemProgram.programId,
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
    return Promise.reject(e);
  }
}
