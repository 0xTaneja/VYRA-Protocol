pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template DepositCircuit () {
    signal input suiMVK;
    signal input recipientPubKeyLow;
    signal input recipientPubKeyHigh;
    signal input secret;
    signal input nullifier;

    signal input commitment;
    signal input linkerHash;
    signal input mvkCommitment;

    signal input timestampYear;
    signal input timestampMonth;
    signal input timestampDay;
    signal input timestampHour;
    signal input timestampMinute;
    signal input timestampSecond;
    signal input depositorKeyLow;
    signal input depositorKeyHigh;
    signal input amount;
    signal input tokenMintLow;
    signal input tokenMintHigh;
    signal input version;
    signal input index;

    component itkHash = Poseidon(7);
    itkHash.inputs[0] <== suiMVK;
    itkHash.inputs[1] <== timestampYear;
    itkHash.inputs[2] <== timestampMonth;
    itkHash.inputs[3] <== timestampDay;
    itkHash.inputs[4] <== timestampHour;
    itkHash.inputs[5] <== timestampMinute;
    itkHash.inputs[6] <== timestampSecond;

    signal itk;
    itk <== itkHash.out;

signal linkerKeyDomain;
linkerKeyDomain <== 360844717390540279866745;

component linkerKeyCalc = Poseidon(2);
linkerKeyCalc.inputs[0] <== itk;
linkerKeyCalc.inputs[1] <== linkerKeyDomain;

signal linkerKey;
linkerKey <== linkerKeyCalc.out;

component linkerHashCalc = Poseidon(3);
linkerHashCalc.inputs[0] <== linkerKey;
linkerHashCalc.inputs[1] <== recipientPubKeyLow;
linkerHashCalc.inputs[2] <== recipientPubKeyHigh;

linkerHash === linkerHashCalc.out;

    component innerHash = Poseidon(4);
    innerHash.inputs[0] <== secret;
    innerHash.inputs[1] <== nullifier;
    innerHash.inputs[2] <== recipientPubKeyLow;
    innerHash.inputs[3] <== recipientPubKeyHigh;

    component commitmentCalc = Poseidon(14);

    commitmentCalc.inputs[0] <== version;
    commitmentCalc.inputs[1] <== index;
    commitmentCalc.inputs[2] <== innerHash.out;
    commitmentCalc.inputs[3] <== depositorKeyLow;
    commitmentCalc.inputs[4] <== depositorKeyHigh;
    commitmentCalc.inputs[5] <== amount;
    commitmentCalc.inputs[6] <== tokenMintLow;
    commitmentCalc.inputs[7] <== tokenMintHigh;
    commitmentCalc.inputs[8] <== timestampYear;
    commitmentCalc.inputs[9] <== timestampMonth;
    commitmentCalc.inputs[10] <== timestampDay;
    commitmentCalc.inputs[11] <== timestampHour;
    commitmentCalc.inputs[12] <== timestampMinute;
    commitmentCalc.inputs[13] <== timestampSecond;

    commitment === commitmentCalc.out;

    component mvkHash = Poseidon(1);
    mvkHash.inputs[0] <== suiMVK;

    mvkCommitment === mvkHash.out;

}

component main {public [commitment, linkerHash, mvkCommitment, timestampYear, timestampMonth, timestampDay, timestampHour, timestampMinute, timestampSecond, depositorKeyLow, depositorKeyHigh, amount, tokenMintLow, tokenMintHigh, version, index]} = DepositCircuit();