import React, { useEffect, useState, useCallback } from 'react';
import 
{
    randomIntFromInterval,
    reverseLinkedList,
    useInterval,
} from '../lib/utils.js';

import './Board.css';

class LinkedListNode 
{
    constructor(value) 
    {
        this.value = value;
        this.next = null;
    }
}

class LinkedList
{
    constructor(value) 
    {
        const node = new LinkedListNode(value);
        this.head = node;
        this.tail = node;
    }
}

const Direction = {
    UP: 'UP',
    RIGHT: 'RIGHT',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
};

const BOARD_SIZE = 15;
const PROBABILITY_OF_DIRECTION_REVERSAL_FOOD = 0.3;

const getStartingSnakeLLValue = board => {
    const rowSize = board.length;
    const colSize = board[0].length;
    const startingRow = Math.round(rowSize / 3);
    const startingCol = Math.round(colSize / 3);
    const startingCell = board[startingRow][startingCol];
    return {
        row: startingRow,
        col: startingCol,
        cell: startingCell,
    };
};

const Board = ({ level = 1, onExit = () => {} }) => {
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [board] = useState(() => createBoard(BOARD_SIZE));
    const [snake, setSnake] = useState(
        new LinkedList(getStartingSnakeLLValue(board)),
    );
    const [snakeCells, setSnakeCells] = useState(
        new Set([snake.head.value.cell]),
    );
    // Naively set the starting food cell 5 cells away from the starting snake cell.
    const [foodCell, setFoodCell] = useState(snake.head.value.cell + 5);
    const [direction, setDirection] = useState(Direction.RIGHT);
    const [foodShouldReverseDirection, setFoodShouldReverseDirection] = useState(
        false,
    );
    const [gameOver, setGameOver] = useState(false);
    const [obstacles, setObstacles] = useState(new Set());

    const handleKeydown = useCallback(e => {
        const newDirection = getDirectionFromKey(e.key);
        const isValidDirection = newDirection !== '';
        if (!isValidDirection) return;
        const snakeWillRunIntoItself =
            getOppositeDirection(newDirection) === direction && snakeCells.size > 1;

        if (snakeWillRunIntoItself) return;
        setDirection(newDirection);
    }, [direction, snakeCells]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [handleKeydown]);

    // Pause interval when game is over by passing `null` as delay.
    useInterval(() => {
        moveSnake();
    }, gameOver ? null : 150);

    // Read high score from localStorage on mount.
    useEffect(() => {
        try {
            const stored = localStorage.getItem('snake_high_score');
            if (stored) setHighScore(Number(stored));
        } catch (e) {
            // ignore storage failures
        }
    }, []);

    // generate obstacles for level 2 (avoid the starting cell)
    useEffect(() => {
        if (level !== 2) {
            setObstacles(new Set());
            return;
        }
        const count = Math.max(8, Math.floor((BOARD_SIZE * BOARD_SIZE) * 0.08));
        const starting = getStartingSnakeLLValue(board);
        const cells = createObstacles(board, count, starting.cell);
        setObstacles(cells);
    }, [level, board]);

    

    const moveSnake = () => {
        const currentHeadCoords = {
            row: snake.head.value.row,
            col: snake.head.value.col,
        };

        const nextHeadCoords = getCoordsInDirection(currentHeadCoords, direction);
        if (isOutOfBounds(nextHeadCoords, board)) {
            // end the game instead of resetting immediately
            handleGameOver();
            return;
        }
        const nextHeadCell = board[nextHeadCoords.row][nextHeadCoords.col];
        if (snakeCells.has(nextHeadCell)) {
            handleGameOver();
            return;
        }
        if (obstacles.has(nextHeadCell)) {
            handleGameOver();
            return;
        }

        const newHead = new LinkedListNode({
            row: nextHeadCoords.row,
            col: nextHeadCoords.col,
            cell: nextHeadCell,
        });
        const currentHead = snake.head;
        snake.head = newHead;
        currentHead.next = newHead;

        const newSnakeCells = new Set(snakeCells);
        newSnakeCells.delete(snake.tail.value.cell);
        newSnakeCells.add(nextHeadCell);

        snake.tail = snake.tail.next;
        if (snake.tail === null) snake.tail = snake.head;

        const foodConsumed = nextHeadCell === foodCell;
        if (foodConsumed) {
            // This function mutates newSnakeCells.
            growSnake(newSnakeCells);
            if (foodShouldReverseDirection) reverseSnake();
            handleFoodConsumption(newSnakeCells);
        }

        setSnakeCells(newSnakeCells);
    };

    const startNewGame = () => {
        const starting = getStartingSnakeLLValue(board);
        const newSnake = new LinkedList(starting);
        setSnake(newSnake);
        setSnakeCells(new Set([newSnake.head.value.cell]));
        setFoodCell(newSnake.head.value.cell + 5);
        setDirection(Direction.RIGHT);
        setFoodShouldReverseDirection(false);
        setScore(0);
        setGameOver(false);
        // regenerate obstacles if level 2
        if (level === 2) {
            const count = Math.max(8, Math.floor((BOARD_SIZE * BOARD_SIZE) * 0.08));
            setObstacles(createObstacles(board, count, newSnake.head.value.cell));
        }
    };

    // This function mutates newSnakeCells.
    const growSnake = newSnakeCells => {
        const growthNodeCoords = getGrowthNodeCoords(snake.tail, direction);
        if (isOutOfBounds(growthNodeCoords, board)) {
            // Snake is positioned such that it can't grow; don't do anything.
            return;
        }
        const newTailCell = board[growthNodeCoords.row][growthNodeCoords.col];
        const newTail = new LinkedListNode({
            row: growthNodeCoords.row,
            col: growthNodeCoords.col,
            cell: newTailCell,
        });
        const currentTail = snake.tail;
        snake.tail = newTail;
        snake.tail.next = currentTail;

        newSnakeCells.add(newTailCell);
    };

    const reverseSnake = () => {
        const tailNextNodeDirection = getNextNodeDirection(snake.tail, direction);
        const newDirection = getOppositeDirection(tailNextNodeDirection);
        setDirection(newDirection);

        // The tail of the snake is really the head of the linked list, which
        // is why we have to pass the snake's tail to `reverseLinkedList`.
        reverseLinkedList(snake.tail);
        const snakeHead = snake.head;
        snake.head = snake.tail;
        snake.tail = snakeHead;
    };

    const handleFoodConsumption = newSnakeCells => {
        const maxPossibleCellValue = BOARD_SIZE * BOARD_SIZE;
        let nextFoodCell;
        // In practice, this will never be a time-consuming operation. Even
        // in the extreme scenario where a snake is so big that it takes up 90%
        // of the board (nearly impossible), there would be a 10% chance of generating
        // a valid new food cell--so an average of 10 operations: trivial.
        while (true) {
            nextFoodCell = randomIntFromInterval(1, maxPossibleCellValue);
            if (
                newSnakeCells.has(nextFoodCell) ||
                foodCell === nextFoodCell ||
                (obstacles && obstacles.has(nextFoodCell))
            )
                continue;
            break;
        }

        const nextFoodShouldReverseDirection =
            Math.random() < PROBABILITY_OF_DIRECTION_REVERSAL_FOOD;

        setFoodCell(nextFoodCell);
        setFoodShouldReverseDirection(nextFoodShouldReverseDirection);
        setScore(prev => prev + 1);
    };

    const handleGameOver = () => {
        // stop the game loop
        setGameOver(true);
        // persist high score
        setHighScore(prev => {
            const newHigh = Math.max(prev, score);
            try {
                localStorage.setItem('snake_high_score', String(newHigh));
            } catch (e) {
                // ignore
            }
            return newHigh;
        });
    };

    return (
        <>
            <h1>Score: {score}</h1>
            <div className="board">
                {board.map((row, rowIdx) => (
                    <div key={rowIdx} className="row">
                        {row.map((cellValue, cellIdx) => {
                            const className = getCellClassName(
                                cellValue,
                                foodCell,
                                foodShouldReverseDirection,
                                snakeCells,
                                obstacles,
                            );
                            return <div key={cellIdx} className={className}></div>;
                        })}
                    </div>
                ))}
            </div>

            {gameOver && (
                <div className="overlay">
                    <div className="game-over">
                        <h2>Game Over</h2>
                        <p>Score: {score}</p>
                        <p>Highest Score: {highScore}</p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="new-game-btn" onClick={startNewGame}>
                                New Game
                            </button>
                            <button className="new-game-btn" onClick={onExit}>
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const createBoard = BOARD_SIZE => {
    let counter = 1;
    const board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        const currentRow = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            currentRow.push(counter++);
        }
        board.push(currentRow);
    }
    return board;
};

const createObstacles = (board, count, avoidCell) => {
    const max = BOARD_SIZE * BOARD_SIZE;
    const obstacles = new Set();
    // simple random placement avoiding the starting cell
    while (obstacles.size < count) {
        const cell = randomIntFromInterval(1, max);
        if (cell === avoidCell) continue;
        obstacles.add(cell);
    }
    return obstacles;
};

const getCoordsInDirection = (coords, direction) => {
    if (direction === Direction.UP) {
        return {
            row: coords.row - 1,
            col: coords.col,
        };
    }
    if (direction === Direction.RIGHT) {
        return {
            row: coords.row,
            col: coords.col + 1,
        };
    }
    if (direction === Direction.DOWN) {
        return {
            row: coords.row + 1,
            col: coords.col,
        };
    }
    if (direction === Direction.LEFT) {
        return {
            row: coords.row,
            col: coords.col - 1,
        };
    }
};

const isOutOfBounds = (coords, board) => {
    const { row, col } = coords;
    if (row < 0 || col < 0) return true;
    if (row >= board.length || col >= board[0].length) return true;
    return false;
};

const getDirectionFromKey = key => {
    if (key === 'ArrowUp') return Direction.UP;
    if (key === 'ArrowRight') return Direction.RIGHT;
    if (key === 'ArrowDown') return Direction.DOWN;
    if (key === 'ArrowLeft') return Direction.LEFT;
    return '';
};

const getNextNodeDirection = (node, currentDirection) => {
    if (node.next === null) return currentDirection;
    const { row: currentRow, col: currentCol } = node.value;
    const { row: nextRow, col: nextCol } = node.next.value;
    if (nextRow === currentRow && nextCol === currentCol + 1) {
        return Direction.RIGHT;
    }
    if (nextRow === currentRow && nextCol === currentCol - 1) {
        return Direction.LEFT;
    }
    if (nextCol === currentCol && nextRow === currentRow + 1) {
        return Direction.DOWN;
    }
    if (nextCol === currentCol && nextRow === currentRow - 1) {
        return Direction.UP;
    }
    return '';
};

const getGrowthNodeCoords = (snakeTail, currentDirection) => {
    const tailNextNodeDirection = getNextNodeDirection(
        snakeTail,
        currentDirection,
    );
    const growthDirection = getOppositeDirection(tailNextNodeDirection);
    const currentTailCoords = {
        row: snakeTail.value.row,
        col: snakeTail.value.col,
    };
    const growthNodeCoords = getCoordsInDirection(
        currentTailCoords,
        growthDirection,
    );
    return growthNodeCoords;
};

const getOppositeDirection = direction => {
    if (direction === Direction.UP) return Direction.DOWN;
    if (direction === Direction.RIGHT) return Direction.LEFT;
    if (direction === Direction.DOWN) return Direction.UP;
    if (direction === Direction.LEFT) return Direction.RIGHT;
};

const getCellClassName = (
    cellValue,
    foodCell,
    foodShouldReverseDirection,
    snakeCells,
    obstacles,
) => {
    let className = 'cell';
    if (snakeCells.has(cellValue)) return 'cell cell-green';
    if (cellValue === foodCell) {
        if (foodShouldReverseDirection) {
            className = 'cell cell-purple';
        } else {
            className = 'cell cell-red';
        }
    }
    if (obstacles && obstacles.has(cellValue)) className = 'cell cell-obstacle';

    return className;
};

export default Board;
