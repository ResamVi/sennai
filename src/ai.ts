export const POPULATION_SIZE   = 20;

const INITIAL_INPUTS    = 100;

const MIN_DURATION      = 10;
const MAX_DURATION      = 800;

const VARIANCE          = 0.2;

const MIN_NEXT          = 50;
const MAX_NEXT          = 800;

export function generate_population(rng: Phaser.Math.RandomDataGenerator): Array<any>
{
    let population = [];
    for(let i = 0; i < POPULATION_SIZE; i++)
        population.push(generate_chromosome(rng));

    return population;
}

function generate_chromosome(rng: Phaser.Math.RandomDataGenerator): Array<any>
{
    let chromosome = [];

    let timestamp = 0;

    let input_count = Math.floor(rand_between(INITIAL_INPUTS * (1 - VARIANCE), INITIAL_INPUTS * (1 + VARIANCE)));
    for(let i = 0; i < input_count; i++)
    {
        let action = rng.pick(["up", "up", "up", "left", "left", "left", "right", "right", "down"])
        let genome = [timestamp, action, rand_between(MIN_DURATION, MAX_DURATION)]
        chromosome.push(genome);

        timestamp += rand_between(MIN_NEXT, MAX_NEXT);
    }

    return chromosome;
}

function rand_between(from: number, to: number)
{
    return (Math.random() * (to - from)) + from;
}

