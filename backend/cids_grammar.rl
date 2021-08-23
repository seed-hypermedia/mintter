%%{
  machine ids;

  alphtype byte;

  BYTE = 0x00..0xFF;

  CID_V1_PREFIX = 0x01;
  
  # Codecs as per https://github.com/multiformats/multicodec/blob/master/table.csv.
  CODEC_RAW           = 0x55;
  CODEC_HASH_IDENTITY = 0x00;
  CODEC_LIBP2P_KEY    = 0x72;
  
  # Our own multicodecs. To be included in the multicodecs table. 109116116 is used as a prefix
  # because utf-8 "mtt" is 109 116 116 in decimals, or 0x6d 0x74 0x74 in hex, but it would be an invalid varint.
  CODEC_MINTTER_ACCOUNT       = 0xC9 0x98 0xA7 0x88 0x04; # 1091161161 as unsigned varint.
  CODEC_MINTTER_DOCUMENT      = 0xCA 0x98 0xA7 0x88 0x04; # 1091161162 as unsigned varint.
  CODEC_MINTTER_DOCUMENT_FEED = 0xCB 0x98 0xA7 0x88 0x04; # 1091161163 as unsigned varint.

  # VARINT has to be parsed in an action and pointer must be advanced as needed.
  VARINT = BYTE >start_varint;

  DIGEST_LENGTH = VARINT;

  DIGEST = BYTE* >start_digest %end_digest;

  MINTTER_ID_TYPE = (CODEC_LIBP2P_KEY | CODEC_MINTTER_ACCOUNT | CODEC_MINTTER DOCUMENT | CODEC_MINTTER_DOCUMENT_FEED);

  MINTTER_ID = CID_V1_PREFIX MINTTER_ID_TYPE CODEC_HASH_IDENTITY DIGEST_LENGTH DIGEST;

  main := MINTTER_ID @err(error);
}