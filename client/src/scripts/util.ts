/**
 *  Round to two decimals
 */
export function round(numb)
{
    return Math.round(numb*100)/100;
}

/**
 * Returns the vector starting at `from` and pointing to `to`
 */
export function vector(from: Phaser.Geom.Point, to: Phaser.Geom.Point)
{
    return new Phaser.Math.Vector2(from.x - to.x, from.y - to.y);
}

/**
 * 
 * @param message 
 */
export function typeOf(message: string): string
{
    return message.split("|")[0];
}

/**
 * 
 * @param message 
 */
export function contentOf(message: string): string
{
    return message.split("|")[1];
}