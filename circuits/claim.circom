pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template MerkleTreeVerifier(levels) {
    signal input leaf;
    signal input pathIndices[levels];
    signal input pathSiblings[levels];
    signal output root;
    
    component hashers[levels];
    signal hashes[levels + 1];
    hashes[0] <== leaf;
    
    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);

        hashers[i].inputs[0] <== hashes[i] + pathIndices[i] * (pathSiblings[i] - hashes[i]);
        hashers[i].inputs[1] <== pathSiblings[i] + pathIndices[i] * (hashes[i] - pathSiblings[i]);
        
        hashes[i + 1] <== hashers[i].out;
    }
    
    root <== hashes[levels];
}

template ClaimCircuit() {

    signal input umbraMVK;
    signal input secret;
    signal input nullifier;
    signal input recipientPubKeyLow;
    signal input recipientPubKeyHigh;

    signal input version;
    signal input commitmentIndex;
    signal input depositorKeyLow;
    signal input depositorKeyHigh;
    signal input amount;
    signal input tokenMintLow;
    signal input tokenMintHigh;
    signal input depositTimestampYear;
    signal input depositTimestampMonth;
    signal input depositTimestampDay;
    signal input depositTimestampHour;
    signal input depositTimestampMinute;
    signal input depositTimestampSecond;

    signal input merklePathIndices[20];
    signal input merklePathSiblings[20];

    signal input merkleRoot;
    signal input nullifierHash;
    signal input claimLinkerHash;
    signal input mvkCommitment;
    signal input claimTimestampYear;
    signal input claimTimestampMonth;
    signal input claimTimestampDay;
    signal input claimTimestampHour;
    signal input claimTimestampMinute;
    signal input claimTimestampSecond;

    component innerHash = Poseidon(4);
    innerHash.inputs[0] <== secret;
    innerHash.inputs[1] <== nullifier;
    innerHash.inputs[2] <== recipientPubKeyLow;
    innerHash.inputs[3] <== recipientPubKeyHigh;

    component commitmentCalc = Poseidon(14);
    commitmentCalc.inputs[0] <== version;
    commitmentCalc.inputs[1] <== commitmentIndex;
    commitmentCalc.inputs[2] <== innerHash.out;
    commitmentCalc.inputs[3] <== depositorKeyLow;
    commitmentCalc.inputs[4] <== depositorKeyHigh;
    commitmentCalc.inputs[5] <== amount;
    commitmentCalc.inputs[6] <== tokenMintLow;
    commitmentCalc.inputs[7] <== tokenMintHigh;
    commitmentCalc.inputs[8] <== depositTimestampYear;
    commitmentCalc.inputs[9] <== depositTimestampMonth;
    commitmentCalc.inputs[10] <== depositTimestampDay;
    commitmentCalc.inputs[11] <== depositTimestampHour;
    commitmentCalc.inputs[12] <== depositTimestampMinute;
    commitmentCalc.inputs[13] <== depositTimestampSecond;
    
    signal commitment;
    commitment <== commitmentCalc.out;

    component merkleVerifier = MerkleTreeVerifier(20);
    merkleVerifier.leaf <== commitment;
    for (var i = 0; i < 20; i++) {
        merkleVerifier.pathIndices[i] <== merklePathIndices[i];
        merkleVerifier.pathSiblings[i] <== merklePathSiblings[i];
    }

    merkleRoot === merkleVerifier.root;

    component nullifierHashCalc = Poseidon(1);
    nullifierHashCalc.inputs[0] <== nullifier;

    nullifierHash === nullifierHashCalc.out;

    component itkHash = Poseidon(7);
    itkHash.inputs[0] <== umbraMVK;
    itkHash.inputs[1] <== claimTimestampYear;
    itkHash.inputs[2] <== claimTimestampMonth;
    itkHash.inputs[3] <== claimTimestampDay;
    itkHash.inputs[4] <== claimTimestampHour;
    itkHash.inputs[5] <== claimTimestampMinute;
    itkHash.inputs[6] <== claimTimestampSecond;
    
    signal itk;
    itk <== itkHash.out;

    signal linkerKeyDomain;
    linkerKeyDomain <== 360844717390540279866745;
    
    component linkerKeyCalc = Poseidon(2);
    linkerKeyCalc.inputs[0] <== itk;
    linkerKeyCalc.inputs[1] <== linkerKeyDomain;
    
    signal linkerKey;
    linkerKey <== linkerKeyCalc.out;

    component claimLinkerCalc = Poseidon(2);
    claimLinkerCalc.inputs[0] <== linkerKey;
    claimLinkerCalc.inputs[1] <== commitmentIndex;

    claimLinkerHash === claimLinkerCalc.out;

    component mvkHash = Poseidon(1);
    mvkHash.inputs[0] <== umbraMVK;

    mvkCommitment === mvkHash.out;
}

component main {public [merkleRoot, nullifierHash, claimLinkerHash, mvkCommitment, claimTimestampYear, claimTimestampMonth, claimTimestampDay, claimTimestampHour, claimTimestampMinute, claimTimestampSecond]} = ClaimCircuit();

