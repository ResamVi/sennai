import { Car} from './car';

export const START_POPULATION   = 10;
export const NEW_SPAWNS         = 5;

const INITIAL_INPUTS    = 100;

const MIN_DURATION      = 1;
const MAX_DURATION      = 100;

const VARIANCE          = 0.2;

/**
 *  Generate a subset of solutions (a set of chromosomes)
 */
export function generate_population(rng: Phaser.Math.RandomDataGenerator): Array<Array<[number, string, number]>>
{
    let population: Array<Array<[number, string, number]>> = [];
    for(let i = 0; i < START_POPULATION; i++)
        population.push(generate_chromosome(rng));

    return population;
}

/**
 *  Generate a single solution
 */
function generate_chromosome(rng: Phaser.Math.RandomDataGenerator): Array<[number, string, number]>
{
    let chromosome: Array<[number, string, number]> = [[0, "up", 15000]];

    let timestamp = 0;

    let input_count = Math.floor(rand_between(INITIAL_INPUTS * (1 - VARIANCE), INITIAL_INPUTS * (1 + VARIANCE)));
    for(let i = 0; i < input_count; i++)
    {
        let action = rng.pick(["left", "left", "left", "left", "right", "right", "right", "down", "down"])
        let duration = rand_between(MIN_DURATION, MAX_DURATION)
        let genome: [number, string, number] = [timestamp, action, duration];
        chromosome.push(genome);

        timestamp += duration;
    }

    return chromosome;
}

/**
 * Fitness Proportionate Selection
 * Become a parent with a probability which is proportional to one's fitness
 */
export function parent_selection(cars: Array<Car>): Car
{
    let fitness_sum = cars.reduce((acc, curr) => acc + curr.fitness, 0);
    let rand = rand_between(0, fitness_sum);

    let partial_sum = 0;
    for(let car of cars)
    {
        partial_sum += car.fitness;
        if(partial_sum > rand)
            return car
    }

    return undefined;
}

/**
 * A.k.a reproduce
 * Uniform crossover
 */
export function crossover(mom: Array<[number, string, number]>, dad: Array<[number, string, number]>): Array<[number, string, number]>
{
    let length = Math.min(mom.length, dad.length);

    let kid: Array<[number, string, number]> = [];
    for(let i = 0; i < length; i++)
    {
        let gene = rand_boolean() ? mom[i] : dad[i];
        kid.push(gene);
    }
    
    // Adopt remaining genes from bigger chromsome
    let parent = mom.length > dad.length ? mom : dad;
    for(let i = length; i < parent.length; i++)
        kid.push(parent[i]);

    return kid;
}

/** Utilities */

function rand_between(from: number, to: number)
{
    return (Math.random() * (to - from)) + from;
}

function rand_boolean()
{
    return Math.round(Math.random()) == 0;
}

