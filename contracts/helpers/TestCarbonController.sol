// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.24;

import { CarbonController } from "../carbon/CarbonController.sol";
import { IVoucher } from "../voucher/interfaces/IVoucher.sol";
import { Token } from "../token/Token.sol";

contract TestCarbonController is CarbonController {
    constructor(IVoucher initVoucher, address proxy) CarbonController(initVoucher, proxy) {}

    function testSetAccumulatedFees(Token token, uint256 amount) external {
        _accumulatedFees[token] = amount;
    }

    function testAccumulatedFees(Token token) external view returns (uint256) {
        return _accumulatedFees[token];
    }

    function version() public pure virtual override returns (uint16) {
        return 2;
    }

    receive() external payable {}
}
