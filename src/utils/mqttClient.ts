import mqtt, { MqttClient } from 'mqtt';

// Free high-availability public WebSocket brokers for browser clients (SSL/WSS)
const PUBLIC_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

export interface RoomMqttHandle {
  publish: (subTopic: string, data: any) => void;
  destroy: () => void;
  isConnected: () => boolean;
}

export function createRoomMqttClient(
  roomId: string,
  playerId: string,
  onMessage: (payload: any) => void,
  onStatusChange: (connected: boolean) => void
): RoomMqttHandle {
  if (typeof window === 'undefined') {
    return { publish: () => {}, destroy: () => {}, isConnected: () => false };
  }

  const cleanRoomKey = roomId.toLowerCase().replace(/[^a-z0-9]/g, '') || 'love';
  const baseTopic = `geolove/room/${cleanRoomKey}`;
  const clientId = `geolove_${cleanRoomKey}_${playerId.slice(0, 8)}_${Math.random().toString(36).substring(2, 7)}`;

  let currentBrokerIndex = 0;
  let client: MqttClient | null = null;
  let isDestroyed = false;
  let connected = false;

  function connectToBroker(index: number) {
    if (isDestroyed) return;
    const brokerUrl = PUBLIC_BROKERS[index % PUBLIC_BROKERS.length];

    try {
      client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 3000,
        keepalive: 30,
      });

      client.on('connect', () => {
        if (isDestroyed) return;
        connected = true;
        onStatusChange(true);
        // Subscribe to all subtopics for this room
        client?.subscribe(`${baseTopic}/#`, { qos: 0 }, (err) => {
          if (!err) {
            // Signal presence immediately
            publish('presence', { playerId, action: 'joined', timestamp: Date.now() });
          }
        });
      });

      client.on('message', (_receivedTopic: string, messageBuffer: any) => {
        if (isDestroyed) return;
        try {
          const rawStr = typeof messageBuffer === 'string'
            ? messageBuffer
            : messageBuffer.toString ? messageBuffer.toString() : new TextDecoder().decode(messageBuffer);
          const parsed = JSON.parse(rawStr);
          // Ignore own messages if senderId matches
          if (parsed && parsed.senderPlayerId && parsed.senderPlayerId === playerId) {
            return;
          }
          onMessage(parsed);
        } catch {
          // ignore corrupted messages
        }
      });

      client.on('offline', () => {
        connected = false;
        onStatusChange(false);
      });

      client.on('close', () => {
        connected = false;
        onStatusChange(false);
      });

      client.on('error', () => {
        connected = false;
        onStatusChange(false);
        // Switch to fallback broker if available
        if (!isDestroyed && currentBrokerIndex < PUBLIC_BROKERS.length - 1) {
          currentBrokerIndex++;
          client?.end(true);
          setTimeout(() => connectToBroker(currentBrokerIndex), 1000);
        }
      });
    } catch {
      // Connect error
    }
  }

  connectToBroker(currentBrokerIndex);

  function publish(subTopic: string, data: any) {
    if (!client || !connected || isDestroyed) return;
    try {
      const topic = subTopic ? `${baseTopic}/${subTopic}` : baseTopic;
      const payload = JSON.stringify({
        ...data,
        senderPlayerId: playerId,
        sentAt: Date.now(),
      });
      client.publish(topic, payload, { qos: 0 });
    } catch {
      // publish error
    }
  }

  function destroy() {
    isDestroyed = true;
    connected = false;
    if (client) {
      try {
        publish('presence', { playerId, action: 'left', timestamp: Date.now() });
        client.end(true);
      } catch {
        // ignore
      }
      client = null;
    }
  }

  return {
    publish,
    destroy,
    isConnected: () => connected,
  };
}
