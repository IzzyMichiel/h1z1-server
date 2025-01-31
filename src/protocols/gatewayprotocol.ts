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

const debug = require("debug")("GatewayProtocol");
import DataSchema from "h1z1-dataschema";
import { GatewayProtocolReadingFormat } from "../types/protocols";
import { packetDescriptors, packetTypes } from "../packets/gatewaypackets";

export class GatewayProtocol {
  parse(data: Buffer): GatewayProtocolReadingFormat | null {
    const packetType = data[0] & 0x1f;
    let result;
    const packet = packetDescriptors[packetType];

    if (packet) {
      debug("receive data : ", data);
      if (
        packet.name === "TunnelPacketToExternalConnection" ||
        packet.name === "TunnelPacketFromExternalConnection"
      ) {
        debug(packet.name, data[0], packetType, data[0] >> 5, data.length);

        return {
          type: packet.type,
          flags: data[0] >> 5,
          fromClient: packet.name === "TunnelPacketFromExternalConnection",
          name: packet.name,
          tunnelData: data.slice(1),
        };
      } else {
        if (packet.schema) {
          debug(packet.name);
          try {
            result = DataSchema.parse(packet.schema, data, 1).result;
          } catch (e) {
            console.error(`${packet.name} : ${e}`);
          }
          return {
            type: packet.type,
            flags: data[0] >> 5,
            name: packet.name,
            result: result,
          };
        } else {
          debug("parse()", "No schema for packet " + packet.name);
          return null;
        }
      }
    } else {
      debug(
        "parse()",
        "Unknown or unhandled gateway packet type: " + packetType
      );
      return null;
    }
  }

  pack(packetName: string, object: any): Buffer | null {
    const packetType = packetTypes[packetName],
      packet = packetDescriptors[packetType];
    let payload, data;
    if (packet) {
      if (
        packet.name === "TunnelPacketToExternalConnection" ||
        packet.name === "TunnelPacketFromExternalConnection"
      ) {
        data = new (Buffer as any).alloc(1 + object.tunnelData.length);
        data.writeUInt8(packetType | (object.channel << 5), 0);
        object.tunnelData.copy(data, 1);
        debug("tunnelpacket send data :", object);
      } else if (packet.name === "ChannelIsRoutable") {
        data = new (Buffer as any).alloc(2);
        data.writeUInt8(packetType | (object.channel << 5), 0);
        data.writeUInt8(object.isRoutable, 1);
        debug("ChannelIsRoutable send data :", data);
      } else {
        if (packet.schema) {
          debug("Packing data for " + packet.name);
          debug("object receive :", object);
          try {
            payload = DataSchema.pack(
              packet.schema,
              object,
              undefined,
              undefined
            );
          } catch (error) {
            console.error(`${packetName} : ${error}`);
          }
          if (payload) {
            data = new (Buffer as any).alloc(1 + payload.length);
            data.writeUInt8(packetType, 0);
            payload.data.copy(data, 1);
            debug("packet w/payload:", payload);
            debug("send data :", data);
          } else {
            debug("Could not pack data schema for " + packet.name);
            return null;
          }
        } else {
          debug("pack()", "No schema for packet " + packet.name);
          return null;
        }
      }
    } else {
      debug(
        "pack()",
        "Unknown or unhandled gateway packet type: " + packetType
      );
      return null;
    }

    return data;
  }
}

exports.GatewayProtocol = GatewayProtocol;
exports.GatewayPackets = packetDescriptors;
