// ======================================================================
//
//   GNU GENERAL PUBLIC LICENSE
//   Version 3, 29 June 2007
//   copyright (C) 2020 - 2021 Quentin Gruber
//   copyright (C) 2021 - 2022 H1emu community
//
//   https://github.com/QuentinGruber/h1z1-server
//   https://www.npmjs.com/package/h1z1-server
//
//   Based on https://github.com/psemu/soe-network
// ======================================================================

import { RemoteInfo } from "dgram";
import { soePacket } from "../../types/soeserver";
import { SOEInputStream } from "./soeinputstream";
import { SOEOutputStream } from "./soeoutputstream";

interface SOEClientStats {
  totalPacketSent: number;
  packetResend: number;
  packetsOutOfOrder: number;
}
export default class SOEClient {
  sessionId: number = 0;
  address: string;
  port: number;
  crcSeed: number;
  crcLength: number = 2;
  clientUdpLength: number = 512;
  serverUdpLength: number = 512;
  packetsSentThisSec: number = 0;
  compression: number;
  useEncryption: boolean = true;
  waitingQueue: soePacket[] = [];
  outQueue: Buffer[] = [];
  priorityQueue: Buffer[] = [];
  protocolName: string = "unset";
  unAckData: Map<number, number> = new Map();
  outOfOrderPackets: soePacket[] = [];
  nextAck: number = -1;
  lastAck: number = -1;
  inputStream: SOEInputStream;
  outputStream: SOEOutputStream;
  waitQueueTimer?: NodeJS.Timeout;
  waitingQueueCurrentByteLength: number = 0;
  soeClientId: string;
  lastPingTimer!: NodeJS.Timeout;
  isDeleted: boolean = false;
  stats: SOEClientStats = {
    totalPacketSent: 0,
    packetsOutOfOrder: 0,
    packetResend: 0,
  };
  constructor(
    remote: RemoteInfo,
    crcSeed: number,
    compression: number,
    cryptoKey: Uint8Array
  ) {
    this.soeClientId = remote.address + ":" + remote.port;
    this.address = remote.address;
    this.port = remote.port;
    this.crcSeed = crcSeed;
    this.compression = compression;
    this.inputStream = new SOEInputStream(cryptoKey);
    this.outputStream = new SOEOutputStream(cryptoKey);
  }
  getNetworkStats(): string[] {
    const { totalPacketSent, packetResend, packetsOutOfOrder } = this.stats;
    const packetLossRate =
      Number((packetResend / totalPacketSent).toFixed(3)) * 100;
    const packetOutOfOrderRate =
      Number((packetsOutOfOrder / totalPacketSent).toFixed(3)) * 100;
    return [
      `Packet loss rate ${packetLossRate}%`,
      `Packet outOfOrder rate ${packetOutOfOrderRate}%`,
    ];
  }
}
