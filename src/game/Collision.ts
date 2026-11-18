import { TrafficVehicle, CoinEntity, GAME_CONSTANTS } from '../types/game';
import { Player } from './Player';

export interface CollisionHitbox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class Collision {
  /**
   * Generates a collision hitbox with 18% insets to ensure fair bumper-to-bumper gameplay.
   */
  public static getPlayerHitbox(player: Player): CollisionHitbox {
    const width = player.width;
    const height = player.height;
    const insetX = width * GAME_CONSTANTS.HITBOX_INSET_FACTOR;
    const insetY = height * GAME_CONSTANTS.HITBOX_INSET_FACTOR;

    return {
      left: player.x - width / 2 + insetX,
      right: player.x + width / 2 - insetX,
      top: player.y + insetY,
      bottom: player.y + height - insetY
    };
  }

  public static getVehicleHitbox(vehicle: TrafficVehicle): CollisionHitbox {
    const insetX = vehicle.width * GAME_CONSTANTS.HITBOX_INSET_FACTOR;
    const insetY = vehicle.height * GAME_CONSTANTS.HITBOX_INSET_FACTOR;

    return {
      left: vehicle.x - vehicle.width / 2 + insetX,
      right: vehicle.x + vehicle.width / 2 - insetX,
      top: vehicle.y + insetY,
      bottom: vehicle.y + vehicle.height - insetY
    };
  }

  /**
   * AABB overlap test
   */
  public static checkAABB(a: CollisionHitbox, b: CollisionHitbox): boolean {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  }

  /**
   * Tests if player has collided with a traffic vehicle.
   */
  public static testVehicleCollision(player: Player, vehicle: TrafficVehicle): boolean {
    if (!vehicle.active) return false;
    const playerBox = this.getPlayerHitbox(player);
    const vehicleBox = this.getVehicleHitbox(vehicle);
    return this.checkAABB(playerBox, vehicleBox);
  }

  /**
   * Tests if player picks up a coin.
   */
  public static testCoinPickup(player: Player, coin: CoinEntity): boolean {
    if (!coin.active || coin.isCollected) return false;

    // Player visual box or generous pickup hitbox
    const playerLeft = player.x - player.width / 2;
    const playerRight = player.x + player.width / 2;
    const playerTop = player.y;
    const playerBottom = player.y + player.height;

    // Coin bounding box
    const coinLeft = coin.x - coin.radius;
    const coinRight = coin.x + coin.radius;
    const coinTop = coin.y - coin.radius;
    const coinBottom = coin.y + coin.radius;

    return (
      playerLeft < coinRight &&
      playerRight > coinLeft &&
      playerTop < coinBottom &&
      playerBottom > coinTop
    );
  }

  /**
   * Checks for near-miss proximity between player and a traffic vehicle.
   * Condition: Vehicle is in active longitudinal range without colliding, and hasn't triggered near miss yet.
   */
  public static testNearMiss(player: Player, vehicle: TrafficVehicle): boolean {
    if (!vehicle.active || vehicle.hasNearMissed) return false;

    const playerCenterY = player.y + player.height / 2;
    const vehicleCenterY = vehicle.y + vehicle.height / 2;

    const dy = Math.abs(playerCenterY - vehicleCenterY);
    // Longitudinal proximity: vehicle is alongside player's cabin
    if (dy > GAME_CONSTANTS.NEAR_MISS_LONGITUDINAL_THRESHOLD) {
      return false;
    }

    const dx = Math.abs(player.x - vehicle.x);
    const combinedHalfWidth = (player.width + vehicle.width) / 2;

    // Must be close laterally, but outside collision bounds
    const isCloseLaterally = dx <= (combinedHalfWidth + GAME_CONSTANTS.NEAR_MISS_LATERAL_THRESHOLD);
    const isOutsideCollision = dx > (combinedHalfWidth * (1 - GAME_CONSTANTS.HITBOX_INSET_FACTOR * 1.5));

    if (isCloseLaterally && isOutsideCollision) {
      vehicle.hasNearMissed = true;
      return true;
    }

    return false;
  }
}
