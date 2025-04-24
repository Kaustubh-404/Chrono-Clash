// lib/game-utils.ts
import type { Card, GameState, Move, Player } from "./types";
import { calculateDamage } from "./cards";

/**
 * Apply a move to the game state and return the updated state
 */
export function applyMove(gameState: GameState, move: Move): GameState {
  // Create a deep copy of the game state to avoid mutation
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  
  // Add the move to the history
  newState.moveHistory = [...newState.moveHistory, move];
  
  // Find the player and opponent
  const currentPlayer = newState.players[move.player];
  const opponentAddress = Object.keys(newState.players).find(addr => addr !== move.player);
  
  if (!opponentAddress || !currentPlayer) {
    console.error("Could not find opponent or current player");
    return gameState;
  }
  
  const opponent = newState.players[opponentAddress];
  
  // Apply damage to the target card
  if (opponent.cards[move.targetCardIndex]) {
    // Apply damage
    opponent.cards[move.targetCardIndex].hp -= move.damage;
    
    // Check if the card is defeated
    if (opponent.cards[move.targetCardIndex].hp <= 0) {
      opponent.cards[move.targetCardIndex].hp = 0;
      opponent.cards[move.targetCardIndex].defeated = true;
    }
  }
  
  // Increment the usage count for the attacking card
  if (currentPlayer.cards[move.cardIndex]) {
    currentPlayer.cards[move.cardIndex].usageCount += 1;
    currentPlayer.cards[move.cardIndex].cooldown = currentPlayer.cards[move.cardIndex].maxCooldown;
  }
  
  // Change the turn
  newState.currentTurn = opponentAddress;
  
  // Check if the game is over
  const allCardsDefeated = opponent.cards.every(card => card.defeated);
  if (allCardsDefeated) {
    newState.status = "completed";
    newState.winner = move.player;
  }
  
  return newState;
}

/**
 * Check if it's the player's turn
 */
export function isPlayerTurn(gameState: GameState, playerAddress: string): boolean {
  return gameState.currentTurn === playerAddress;
}

/**
 * Check if a card can be selected (not defeated, not on cooldown, player's turn)
 */
export function canSelectCard(gameState: GameState, playerAddress: string, card: Card): boolean {
  if (!isPlayerTurn(gameState, playerAddress)) return false;
  if (card.defeated) return false;
  if (card.cooldown > 0) return false;
  return true;
}

/**
 * Check if a card can be attacked (not defeated, opponent's card)
 */
export function canAttackCard(gameState: GameState, playerAddress: string, opponentCard: Card): boolean {
  if (!isPlayerTurn(gameState, playerAddress)) return false;
  return !opponentCard.defeated;
}

/**
 * Get a player's cards
 */
export function getPlayerCards(gameState: GameState, playerAddress: string): Card[] {
  return gameState.players[playerAddress]?.cards || [];
}

/**
 * Get the opponent's cards
 */
export function getOpponentCards(gameState: GameState, playerAddress: string): Card[] {
  const opponentAddress = Object.keys(gameState.players).find(addr => addr !== playerAddress);
  if (!opponentAddress) return [];
  return gameState.players[opponentAddress]?.cards || [];
}

/**
 * Create a new move
 */
export function createMove(
  playerAddress: string, 
  cardIndex: number, 
  targetCardIndex: number, 
  attackType: "normal" | "special",
  attackingCard: Card,
  targetCard: Card
): Move {
  const damage = calculateDamage(attackingCard, targetCard, attackType);
  
  return {
    player: playerAddress,
    cardIndex,
    targetCardIndex,
    attackType,
    damage,
    timestamp: Date.now(),
  };
}

/**
 * Format remaining time nicely
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get player status (waiting for opponent, your turn, etc.)
 */
export function getPlayerStatus(gameState: GameState, playerAddress: string): string {
  if (gameState.status === "awaiting_players") {
    return "Waiting for opponent...";
  }
  
  if (gameState.status === "completed") {
    return gameState.winner === playerAddress ? "Victory!" : "Defeat!";
  }
  
  return gameState.currentTurn === playerAddress ? "Your Turn" : "Opponent's Turn";
}

/**
 * Calculate wager rewards
 */
export function calculateWagerRewards(gameState: GameState): number {
  // The winner gets the entire wager pool
  return gameState.wager;
}