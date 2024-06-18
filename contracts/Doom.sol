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
    uint threshold = 2;

    constructor(address ccAddress) ERC1155("") {
        carbonController = CarbonController(ccAddress);
        carbonAddress = ccAddress;
    }

    using ECDSA for bytes32;

    mapping(uint etfId => uint totalBalance) etfTotalBalance;
    mapping(uint etfId => mapping(address tokenAddress => uint liquidity)) etfTokenPool;
    mapping(uint etfId => mapping(address owner => uint balance)) etfUserBalance;

    event StrategiesCreated(bytes32 idsHash);
    event StategiesIdList(uint[] ids);
    event EtfIdCreated(uint etfId);
    event EtfSharesBought(uint etfId, uint value);
    event Received(address, uint);

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

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function test() pure public returns(string memory) {
        return "This works somehow";
    }

    function getStrategy(uint _id) public view returns (CarbonController.Strategy memory) {
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
        uint etfId = uint(idsHash);
        _mintEtfId(etfId);
        return idsHash;
    }

    function _mintEtfId(uint etfId) private {
        _mint(msg.sender, etfId, 0, "");
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
        uint etfId,
        address _token,
        uint128 _amount,
        uint[] memory _idList
    ) external returns (uint) {
        //TODO make sure the id exists (require ttl supply / uri());
        uint length = _idList.length;
        // uint ratio = length * 2;
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
        require( tokenCount > 0, "The token you're trying to invest on is not part of this portfolio");
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
        _mint(msg.sender, etfId, _amount, "");
        etfTotalBalance[etfId] = etfTotalBalance[etfId] + _amount;
        etfUserBalance[etfId][msg.sender] = etfUserBalance[etfId][msg.sender] + _amount;
        return tokenCount;
    }

    function updatePrice(
        uint _etfId,
        CarbonController.Strategy[] calldata _currentStrategies,
        CarbonController.Strategy[] calldata _newStrategies,
        bytes[] calldata _signatures
    ) public {
        uint length = _currentStrategies.length;
        require(length == _newStrategies.length, "Different amount of current and new strategies");
        require(_verifyUpdatePrice(_etfId, _newStrategies, _signatures), "Signers shares doesn't exceed the threshold required");
        for(uint i = 0; i < length; i++) {
            require(_currentStrategies[i].id == _newStrategies[i].id, "Missmatch beetween current and new strategies");
            carbonController.updateStrategy(_newStrategies[i].id, _currentStrategies[i].orders, _newStrategies[i].orders);
        }
    }

    function _verifyUpdatePrice(
        uint _etfId, 
        CarbonController.Strategy[] calldata _newStrategies,
        bytes[] calldata _signatures
        ) view private returns(bool) {
        for(uint i = 0; i < _signatures.length; i++) {
            for(uint j = 0; j < _signatures.length; j++) {
                if(i == j) continue;
                if(keccak256(_signatures[i]) == keccak256(_signatures[j])) {
                    revert("Same signer signed multiple times");
                }
            }
        }
        bytes32[] memory stragiesHashes = new bytes32[](_newStrategies.length);
        uint totalShares = 0;
        for(uint i = 0; i < _newStrategies.length; i++) {
            stragiesHashes[i] = _hashStrategy(_newStrategies[i]);
        }
        bytes32 message = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(stragiesHashes)));
        for (uint i = 0; i < _signatures.length; i++) {
            address signerAddress = ECDSA.recover(message, _signatures[i]);
            totalShares += etfUserBalance[_etfId][signerAddress];
        }
        uint minSharesReq = etfTotalBalance[_etfId] / threshold;
        return totalShares >= minSharesReq;
    }

    function _hashStrategy(CarbonController.Strategy calldata _strategy) pure private returns(bytes32) {
        CarbonController.Order memory order0 = _strategy.orders[0];
        CarbonController.Order memory order1 = _strategy.orders[1];
        bytes32 hashedOrder0 = keccak256(abi.encodePacked(order0.y, order0.z, order0.A, order0.B));
        bytes32 hashedOrder1 = keccak256(abi.encodePacked(order1.y, order1.z, order1.A, order1.B));
        return keccak256(abi.encodePacked(_strategy.tokens[0], _strategy.tokens[1], hashedOrder0, hashedOrder1));
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
