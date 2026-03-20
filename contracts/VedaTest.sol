// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VedaTest {
    string public message = "Hello from VedaLedger on PolkaVM";

    function getMessage() public view returns (string memory) {
        return message;
    }
}
