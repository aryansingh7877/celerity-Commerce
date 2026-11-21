import { Kafka, logLevel, type Producer, type Consumer } from 'kafkajs';
import { env } from '../config/env.js';

let kafka: Kafka | null = null;

export function getKafka(): Kafka | null {
  if (!env.hasKafka || !env.KAFKA_BROKERS) return null;
  if (!kafka) {
    const brokers = env.KAFKA_BROKERS.split(',').map((b) => b.trim()).filter(Boolean);
    kafka = new Kafka({
      clientId: 'celerity-commerce',
      brokers,
      ssl: env.KAFKA_SSL !== false,
      sasl:
        env.KAFKA_USERNAME && env.KAFKA_PASSWORD
          ? {
              mechanism: (env.KAFKA_SASL_MECHANISM as 'scram-sha-256') || 'scram-sha-256',
              username: env.KAFKA_USERNAME,
              password: env.KAFKA_PASSWORD,
            }
          : undefined,
      logLevel: logLevel.ERROR,
    });
  }
  return kafka;
}

export async function createProducer(): Promise<Producer | null> {
  const k = getKafka();
  if (!k) return null;
  const producer = k.producer();
  await producer.connect();
  return producer;
}

export async function createConsumer(groupId: string): Promise<Consumer | null> {
  const k = getKafka();
  if (!k) return null;
  const consumer = k.consumer({ groupId });
  await consumer.connect();
  return consumer;
}

export function getKafkaTopic() {
  return env.KAFKA_TOPIC;
}
