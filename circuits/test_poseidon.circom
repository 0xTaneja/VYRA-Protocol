pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template Hasher2(){
    signal input in[2];
    signal output op;

    component pose = Poseidon(2);
    pose.inputs[0] <== in[0];
    pose.inputs[1] <== in[1];

    op <== pose.out;

}

component main = Hasher2();