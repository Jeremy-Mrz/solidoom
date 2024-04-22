// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

interface CarbonController {
    struct TradeAction {
        uint256 strategyId;
        uint128 amount;
    }

    struct Order {
        uint128 y;
        uint128 z;
        uint64 A;
        uint64 B;
    }

    struct Strategy {
        uint256 id;
        address owner;
        address[2] tokens;
        Order[2] orders;
    }
    function strategy(uint256 id) external view returns (Strategy memory);
    function createStrategy(
        address token0,
        address token1,
        Order[2] calldata orders
    ) external payable returns (uint256);
    function tradeBySourceAmount(
        address sourceToken,
        address targetToken,
        TradeAction[] calldata tradeActions,
        uint256 deadline,
        uint128 minReturn
    ) external payable returns (uint128);
    function updateStrategy(
        uint256 strategyId,
        Order[2] calldata currentOrders,
        Order[2] calldata newOrders
    ) external payable;
}

contract Doom is IERC721Receiver, ERC1155 {
    CarbonController carbonController;
    address carbonAddress;

    constructor(address ccAddress) ERC1155("") {
        carbonController = CarbonController(ccAddress);
        carbonAddress = ccAddress;
    }

    event StrategiesCreated(bytes32 idsHash);
    event StategiesIdList(uint[] ids);
    event EtfIdCreated(uint etfId);
    event EtfSharesBought(uint etfId, uint value);
    event Received(address, uint);
    event PriceUpdateSignerAddress(address[] addresses);

    struct Strategies {
        address token0;
        address token1;
        CarbonController.Order[2] orders;
    }

    struct TradeInfos {
        address source;
        address target;
        CarbonController.TradeAction[] tradeActions;
        uint256 deadline;
        uint128 minReturn;
        uint value;
    }

    struct StrategyInformations {
        address token0;
        address token1;
        CarbonController.Order order0;
        CarbonController.Order order1;
    }

    // etfId => tokenAddress => number of ERC20 for this etf
    mapping(uint => mapping(address => uint)) etfTokenPool;

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function getStrategy(
        uint _id
    ) public view returns (CarbonController.Strategy memory) {
        return carbonController.strategy(_id);
    }

    function callCreateStrategy(
        address token0,
        address token1,
        CarbonController.Order[2] calldata orders
    ) external payable returns (uint256) {
        uint id = carbonController.createStrategy(token0, token1, orders);
        return id;
    }

    function multiCallCreateStrategy(
        Strategies[] calldata strategies
    ) external payable returns (bytes32) {
        uint length = strategies.length;
        require(length > 0, "No strategies received");
        uint[] memory ids = new uint[](length);
        for (uint i = 0; i < length; i++) {
            uint id = carbonController.createStrategy(
                strategies[i].token0,
                strategies[i].token1,
                strategies[i].orders
            );
            ids[i] = (id);
        }
        emit StategiesIdList(ids);
        bytes32 idsHash = keccak256(abi.encodePacked(ids));
        emit StrategiesCreated(idsHash);
        _mintEtfId(idsHash);
        return idsHash;
    }

    function _mintEtfId(bytes32 idsHash) private {
        uint etfId = uint(idsHash);
        _mint(msg.sender, etfId, msg.value, "");
        emit EtfIdCreated(etfId);
    }

    function getBalance(
        address account,
        uint256 id
    ) public view virtual returns (uint) {
        return balanceOf(account, id);
    }

    /**
     *@dev Function used only for testing, should not be used / deployed
     */
    function tradeBySourceAmountSingle(
        address sourceToken,
        address targetToken,
        CarbonController.TradeAction[] calldata tradeActions,
        uint256 deadline,
        uint128 minReturn
    ) external payable returns (uint128) {
        return
            carbonController.tradeBySourceAmount{value: msg.value}(
                sourceToken,
                targetToken,
                tradeActions,
                deadline,
                minReturn
            );
    }

    function tradeBySourceAmount(
        TradeInfos[] memory trades,
        uint etfId
    ) public payable {
        require(trades.length > 0, "No trade infos received");
        uint totalValue = 0;
        for (uint i = 0; i < trades.length; i++) {
            totalValue = totalValue + trades[i].value;
        }
        require(
            msg.value == totalValue,
            "Error calculating quote part of tokens"
        );
        for (uint i = 0; i < trades.length; i++) {
            uint targetAmount = carbonController.tradeBySourceAmount{
                value: trades[i].value
            }(
                trades[i].source,
                trades[i].target,
                trades[i].tradeActions,
                trades[i].deadline,
                trades[i].minReturn
            );
            etfTokenPool[etfId][trades[i].target] = targetAmount;
        }
    }

    function invest(TradeInfos[] memory trades, uint etfId) public payable {
        //TODO make sure the id exists (require ttl supply / uri());
        require(msg.value > 0, "No value received");
        tradeBySourceAmount(trades, etfId);
        _mint(msg.sender, etfId, msg.value, "");
        emit EtfSharesBought(etfId, msg.value);
    }

    function investo(
        address _token,
        uint128 _amount,
        uint[] memory _idList
    ) external returns (uint) {
        //TODO make sure the id exists (require ttl supply / uri());
        uint length = _idList.length;
        uint ratio = length * 2;
        CarbonController.Strategy[]
            memory tokenStrategies = new CarbonController.Strategy[](length);
        uint tokenCount = 0;
        uint totalTokenBudget = 0;
        for (uint i = 0; i < length; i++) {
            CarbonController.Strategy memory strat = getStrategy(_idList[i]);
            if (_token == strat.tokens[0]) {
                tokenStrategies[i] = strat;
                totalTokenBudget += strat.orders[0].y;
                tokenCount++;
            }
            if (_token == strat.tokens[1]) {
                tokenStrategies[i] = strat;
                totalTokenBudget += strat.orders[1].y;
                tokenCount++;
            }
        }
        require(
            tokenCount > 0,
            "The token you're trying to invest on is not part of this portfolio"
        );
        uint128 share = _amount / uint128(tokenCount);
        uint tokenAmount = _amount;
        IERC20(_token).transferFrom(msg.sender, address(this), tokenAmount);
        IERC20(_token).approve(carbonAddress, tokenAmount);
        for (uint i = 0; i < tokenStrategies.length; i++) {
            CarbonController.Strategy memory strat = tokenStrategies[i];
            if (_token == strat.tokens[0]) {
                CarbonController.Order memory currentOrder = strat.orders[0];
                uint128 newBudget = currentOrder.y + share;
                CarbonController.Order memory newOrder = CarbonController.Order(
                    newBudget,
                    newBudget,
                    currentOrder.A,
                    currentOrder.B
                );
                carbonController.updateStrategy(
                    strat.id,
                    strat.orders,
                    [newOrder, strat.orders[1]]
                );
            }
            if (_token == strat.tokens[1]) {
                CarbonController.Order memory currentOrder = strat.orders[1];
                uint128 newBudget = currentOrder.y + share;
                CarbonController.Order memory newOrder = CarbonController.Order(
                    newBudget,
                    newBudget,
                    currentOrder.A,
                    currentOrder.B
                );
                carbonController.updateStrategy(
                    strat.id,
                    strat.orders,
                    [strat.orders[0], newOrder]
                );
            }
        }
        return tokenCount;
    }

    function updatePrice(
        uint _etfId,
        // CarbonController.Strategy[] calldata _currentStrategies,
        StrategyInformations[] calldata _newStrategies,
        bytes[] calldata _signatures
    ) view public returns(address[] memory) {
        //Create solidity message from strategy
        //Ecrecover addresses from message + signature
        //Get balance of each address
        //Verify if balance > treshhold
        //Update strategy (retrieve current strategy values);
        address[] memory addresses = new address[](_newStrategies.length);
        for (uint i = 0; i < _signatures.length; i++) {
            bytes memory signature = _signatures[i];
            bytes32 message = ECDSA.toEthSignedMessageHash(_hashStrategy(_newStrategies[i]));
            address signerAddress = ECDSA.recover(message, signature);
            addresses[i] = signerAddress;
        }
        return addresses;
    }

    function _hashStrategy(StrategyInformations calldata _strategy) pure private returns(bytes32) {
        CarbonController.Order memory order0 = _strategy.order0;
        CarbonController.Order memory order1 = _strategy.order1;
        bytes32 order0Hash = keccak256(abi.encodePacked(order0.y, order0.z, order0.A, order0.B));
        bytes32 order1Hash = keccak256(abi.encodePacked(order1.y, order1.z, order1.A, order1.B));
        return keccak256(abi.encodePacked(_strategy.token0, _strategy.token1, order0Hash, order1Hash));
    }

    function hashTest(address token0, address token1, bytes calldata signature) pure public returns(address) {
        bytes32 hashedTokens = keccak256(abi.encodePacked(token0, token1));
        bytes32 message = ECDSA.toEthSignedMessageHash(hashedTokens);
        address signerAddress = ECDSA.recover(message, signature);
        return signerAddress;
    }

    function hashOrderTest(CarbonController.Order calldata order0, CarbonController.Order calldata order1, bytes calldata signature) pure public returns(address) {
        bytes32 order0Hash = keccak256(abi.encodePacked(order0.y, order0.z, order0.A, order0.B));
        bytes32 order1Hash = keccak256(abi.encodePacked(order1.y, order1.z, order1.A, order1.B));
        bytes32 message = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(order0Hash, order1Hash)));
        address signerAddress = ECDSA.recover(message, signature);
        return signerAddress;
    }
    function hashSignleOrderTest(CarbonController.Order calldata order0, bytes calldata signature) pure public returns(address, uint, uint, uint, uint) {
        bytes32 order0Hash = keccak256(abi.encodePacked(uint(order0.y), uint(order0.z), uint(order0.A), uint(order0.B)));
        bytes32 message = ECDSA.toEthSignedMessageHash(order0Hash);
        address signerAddress = ECDSA.recover(message, signature);
        return (signerAddress, order0.y, order0.z, order0.A, order0.B);
    }

    function hashNumber(uint256 n0, uint256 n1, bytes calldata signature) pure public returns(address) {
        bytes32 hashedNumbers = keccak256(abi.encodePacked(n0, n1));
        bytes32 message = ECDSA.toEthSignedMessageHash(hashedNumbers);
        address signerAddress = ECDSA.recover(message, signature);
        return signerAddress;
    }

    function getEtfTokenBalance(
        uint etfId,
        address token
    ) public view returns (uint) {
        return etfTokenPool[etfId][token];
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
