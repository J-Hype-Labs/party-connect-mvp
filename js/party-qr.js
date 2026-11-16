/**
 * PartyQR - QR 코드 생성 유틸리티 (오프라인 동작, 의존성 없음)
 *
 * 내장 QR 인코더: qrcode-generator (Kazuhiko Arase)
 * 원본 출처: https://github.com/kazuhikoarase/qrcode-generator
 * 라이선스: MIT License
 * Copyright (c) 2010 Kazuhiko Arase
 *
 * 이 파일은 qrcode-generator의 핵심 알고리즘을 인라인 임베드하여
 * 외부 CDN/네트워크 의존 없이 QR 코드를 생성합니다.
 */

(function () {
  'use strict';

  // ============================================================
  // qrcode-generator (Kazuhiko Arase) - MIT License
  // 원본: https://github.com/kazuhikoarase/qrcode-generator
  // 버전: 1.4.4 (알고리즘 핵심 부분만 추출/단순화)
  // ============================================================

  /**
   * QR 코드 모드
   */
  var QRMode = {
    MODE_NUMBER: 1 << 0,
    MODE_ALPHA_NUM: 1 << 1,
    MODE_8BIT_BYTE: 1 << 2,
    MODE_KANJI: 1 << 3
  };

  /**
   * 오류 정정 레벨
   */
  var QRErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  };

  /**
   * 마스크 패턴
   */
  var QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
  };

  /**
   * QR 코드 버전별 정보 (버전 1~40)
   */
  var QR_VERSIONS = (function () {
    var versions = [null];
    var data = [
      // ver 1
      [ [26, 19, 7, 1], [26, 16, 10, 1], [26, 13, 13, 1], [26, 9, 17, 1] ],
      // ver 2
      [ [44, 34, 10, 1], [44, 28, 16, 1], [44, 22, 22, 1], [44, 16, 28, 1] ],
      // ver 3
      [ [70, 55, 15, 1], [70, 44, 26, 1], [70, 34, 36, 2], [70, 26, 44, 2] ],
      // ver 4
      [ [100, 80, 20, 1], [100, 64, 36, 1], [100, 48, 52, 2], [100, 36, 64, 4] ],
      // ver 5
      [ [134, 108, 26, 1], [134, 86, 48, 1], [134, 62, 72, 2], [134, 46, 88, 2] ],
      // ver 6
      [ [172, 136, 36, 1], [172, 108, 64, 2], [172, 76, 96, 4], [172, 60, 112, 4] ],
      // ver 7
      [ [196, 156, 40, 2], [196, 124, 72, 2], [196, 88, 108, 4], [196, 66, 130, 4] ],
      // ver 8
      [ [242, 194, 48, 2], [242, 154, 88, 2], [242, 110, 132, 4], [242, 86, 156, 4] ],
      // ver 9
      [ [292, 232, 60, 2], [292, 182, 110, 3], [292, 132, 160, 4], [292, 100, 192, 4] ],
      // ver 10
      [ [346, 274, 72, 2], [346, 216, 130, 3], [346, 154, 192, 4], [346, 122, 224, 4] ]
    ];
    for (var v = 1; v <= 10; v++) {
      versions[v] = {
        L: { total: data[v-1][0][0], data: data[v-1][0][1], ec: data[v-1][0][2], blocks: data[v-1][0][3] },
        M: { total: data[v-1][1][0], data: data[v-1][1][1], ec: data[v-1][1][2], blocks: data[v-1][1][3] },
        Q: { total: data[v-1][2][0], data: data[v-1][2][1], ec: data[v-1][2][2], blocks: data[v-1][2][3] },
        H: { total: data[v-1][3][0], data: data[v-1][3][1], ec: data[v-1][3][2], blocks: data[v-1][3][3] }
      };
    }
    return versions;
  })();

  function getModuleCount(version) {
    return 17 + 4 * version;
  }

  function encodeString(string) {
    if (/^[0-9]+$/.test(string)) {
      return { mode: QRMode.MODE_NUMBER, data: string };
    }
    if (/^[0-9A-Z $%*+\-./:]+$/.test(string)) {
      return { mode: QRMode.MODE_ALPHA_NUM, data: string };
    }
    return { mode: QRMode.MODE_8BIT_BYTE, data: string };
  }

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function (index) {
      var bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
    },
    put: function (num, length) {
      for (var i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
      }
    },
    putBit: function (bit) {
      var bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      this.length++;
    },
    getBuffer: function () { return this.buffer; },
    getLengthInBits: function () { return this.length; }
  };

  function QRPolynomial(num, shift) {
    if (num.length === undefined) throw new Error(num.length + '/' + shift);
    var offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }
  QRPolynomial.prototype = {
    get: function (index) { return this.num[index]; },
    getLength: function () { return this.num.length; },
    multiply: function (e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < this.getLength(); i++) {
        for (var j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      var tl = this.getLength();
      var el = e.getLength();
      if (tl < el) return this;
      var num = this.num.slice();
      for (var i = 0; i <= tl - el; i++) {
        if (num[i] !== 0) {
          var ratio = QRMath.gexp(QRMath.glog(num[i]) - QRMath.glog(e.get(0)));
          for (var j = 0; j < el; j++) {
            num[i + j] ^= QRMath.gexp(QRMath.glog(e.get(j)) + ratio);
          }
        }
      }
      var remainder = num.slice(tl - el + 1);
      return new QRPolynomial(remainder, 0);
    }
  };

  var QRMath = {
    glog: function (n) {
      if (n < 1) throw new Error('glog(' + n + ')');
      return QRMath.LOG_TABLE[n];
    },
    gexp: function (n) {
      while (n < 0) n += 255;
      while (n >= 256) n -= 255;
      return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };

  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      QRMath.EXP_TABLE[i] = x;
      QRMath.LOG_TABLE[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    QRMath.EXP_TABLE[255] = QRMath.EXP_TABLE[0];
  })();

  function QRRSBlock(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
  QRRSBlock.RS_BLOCK_TABLE = [
    // L
    [1, 26, 19], [1, 44, 34], [1, 70, 55], [1, 100, 80], [1, 134, 108], [2, 86, 68], [2, 98, 78], [2, 121, 97], [2, 146, 116], [2, 174, 138],
    // M
    [1, 26, 16], [1, 44, 28], [1, 70, 44], [2, 50, 32], [2, 67, 43], [2, 86, 54], [4, 51, 36], [4, 62, 42], [4, 76, 52], [4, 88, 56],
    // Q
    [1, 26, 13], [1, 44, 22], [2, 35, 17], [2, 50, 24], [4, 33, 15], [4, 43, 18], [4, 44, 18], [4, 56, 22], [6, 36, 15], [6, 43, 15],
    // H
    [1, 26, 9], [1, 44, 16], [2, 35, 13], [4, 26, 9], [4, 32, 10], [4, 40, 12], [6, 28, 9], [6, 32, 9], [6, 37, 10], [8, 27, 8]
  ];
  QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock === undefined) throw new Error('bad rs block @ typeNumber:' + typeNumber + '/errorCorrectLevel:' + errorCorrectLevel);
    var length = rsBlock.length / 3;
    var list = [];
    for (var i = 0; i < length; i++) {
      var count = rsBlock[i * 3 + 0];
      var totalCount = rsBlock[i * 3 + 1];
      var dataCount = rsBlock[i * 3 + 2];
      for (var j = 0; j < count; j++) list.push(new QRRSBlock(totalCount, dataCount));
    }
    return list;
  };
  QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default: return undefined;
    }
  };

  var QRUtil = {
    PATTERN_POSITION_TABLE: [
      [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
      [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
      [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
    ],
    G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    getBCHTypeInfo: function (data) {
      var d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
      }
      return ((data << 10) | d) ^ QRUtil.G15_MASK;
    },
    getBCHTypeNumber: function (data) {
      var d = data << 12;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
        d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
      }
      return (data << 12) | d;
    },
    getBCHDigit: function (data) {
      var digit = 0;
      while (data !== 0) { digit++; data >>>= 1; }
      return digit;
    },
    getPatternPosition: function (typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },
    getMask: function (maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000: return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001: return i % 2 === 0;
        case QRMaskPattern.PATTERN010: return j % 3 === 0;
        case QRMaskPattern.PATTERN011: return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case QRMaskPattern.PATTERN101: return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
        default: throw new Error('bad maskPattern:' + maskPattern);
      }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
      var a = new QRPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      }
      return a;
    },
    getLengthInBits: function (mode, type) {
      if (1 <= type && type < 10) {
        if (mode === QRMode.MODE_NUMBER) return 10;
        if (mode === QRMode.MODE_ALPHA_NUM) return 9;
        if (mode === QRMode.MODE_8BIT_BYTE) return 8;
        if (mode === QRMode.MODE_KANJI) return 8;
      } else if (type < 27) {
        if (mode === QRMode.MODE_NUMBER) return 12;
        if (mode === QRMode.MODE_ALPHA_NUM) return 11;
        if (mode === QRMode.MODE_8BIT_BYTE) return 16;
        if (mode === QRMode.MODE_KANJI) return 10;
      } else if (type < 41) {
        if (mode === QRMode.MODE_NUMBER) return 14;
        if (mode === QRMode.MODE_ALPHA_NUM) return 13;
        if (mode === QRMode.MODE_8BIT_BYTE) return 16;
        if (mode === QRMode.MODE_KANJI) return 12;
      }
      throw new Error('mode:' + mode + '/type:' + type);
    },
    getLostPoint: function (qrCode) {
      var moduleCount = qrCode.getModuleCount();
      var lostPoint = 0;
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount; col++) {
          var sameCount = 0;
          var dark = qrCode.isDark(row, col);
          for (var r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) continue;
            for (var c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) continue;
              if (r === 0 && c === 0) continue;
              if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
            }
          }
          if (sameCount > 5) lostPoint += (3 + sameCount - 5);
        }
      }
      for (var row = 0; row < moduleCount - 1; row++) {
        for (var col = 0; col < moduleCount - 1; col++) {
          var count = 0;
          if (qrCode.isDark(row, col)) count++;
          if (qrCode.isDark(row + 1, col)) count++;
          if (qrCode.isDark(row, col + 1)) count++;
          if (qrCode.isDark(row + 1, col + 1)) count++;
          if (count === 0 || count === 4) lostPoint += 3;
        }
      }
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount - 6; col++) {
          if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) lostPoint += 40;
        }
      }
      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount - 6; row++) {
          if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) lostPoint += 40;
        }
      }
      var darkCount = 0;
      for (var row = 0; row < moduleCount; row++) for (var col = 0; col < moduleCount; col++) if (qrCode.isDark(row, col)) darkCount++;
      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    }
  };

  function QRCode(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }
  QRCode.prototype = {
    addData: function (data) {
      var encoded = encodeString(data);
      this.dataList.push({ mode: encoded.mode, data: encoded.data });
      this.dataCache = null;
    },
    make: function () {
      if (this.typeNumber === undefined || this.typeNumber < 1) {
        var buffer = new QRBitBuffer();
        for (var i = 0; i < this.dataList.length; i++) {
          var data = this.dataList[i];
          var mode = data.mode;
          buffer.put(mode, 4);
          buffer.put(data.data.length, QRUtil.getLengthInBits(mode, 1));
          if (mode === QRMode.MODE_NUMBER) this.writeNumber(buffer, data.data);
          else if (mode === QRMode.MODE_ALPHA_NUM) this.writeAlphaNum(buffer, data.data);
          else if (mode === QRMode.MODE_8BIT_BYTE) this.write8BitByte(buffer, data.data);
        }
        var bits = buffer.getLengthInBits();
        for (var version = 1; version <= 40; version++) {
          var info = QR_VERSIONS[version];
          if (info) {
            var levelInfo = info.M;
            var capacity = levelInfo.data * 8;
            if (bits <= capacity) { this.typeNumber = version; break; }
          }
        }
        if (!this.typeNumber) this.typeNumber = 1;
      }
      var maskPattern = this.getBestMaskPattern();
      this.makeImpl(false, maskPattern);
    },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = getModuleCount(this.typeNumber);
      this.modules = new Array(this.moduleCount);
      for (var row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (var col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.typeNumber >= 7) this.setupTypeNumber(test);
      this.mapData(this.dataCache || this.createData(), maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r < 0 || this.moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c < 0 || this.moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    setupPositionAdjustPattern: function () {
      var pos = QRUtil.getPatternPosition(this.typeNumber);
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i], col = pos[j];
          if (this.modules[row][col] !== null) continue;
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              this.modules[row + r][col + c] = (r === -2 || r === 2 || c === -2 || c === 2);
            }
          }
        }
      }
    },
    setupTimingPattern: function () {
      for (var r = 8; r < this.moduleCount - 8; r++) if (this.modules[r][6] === null) this.modules[r][6] = (r % 2 === 0);
      for (var c = 8; c < this.moduleCount - 8; c++) if (this.modules[6][c] === null) this.modules[6][c] = (c % 2 === 0);
    },
    setupTypeInfo: function (test, maskPattern) {
      var data = (this.errorCorrectLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);
      for (var i = 0; i < 15; i++) {
        var mod = !test && ((bits >> i) & 1) === 1;
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
      }
      for (var i = 0; i < 15; i++) {
        var mod = !test && ((bits >> i) & 1) === 1;
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    setupTypeNumber: function (test) {
      var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
      for (var i = 0; i < 18; i++) {
        var mod = !test && ((bits >> i) & 1) === 1;
        this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
      }
      for (var i = 0; i < 18; i++) {
        var mod = !test && ((bits >> i) & 1) === 1;
        this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    },
    writeNumber: function (buffer, data) {
      var i = 0;
      while (i + 2 < data.length) { buffer.put(parseInt(data.substring(i, i + 3), 10), 10); i += 3; }
      if (i < data.length) {
        if (data.length - i === 1) buffer.put(parseInt(data.substring(i, i + 1), 10), 4);
        else if (data.length - i === 2) buffer.put(parseInt(data.substring(i, i + 2), 10), 7);
      }
    },
    writeAlphaNum: function (buffer, data) {
      var TABLE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
      var i = 0;
      while (i + 1 < data.length) {
        var c1 = TABLE.indexOf(data.charAt(i));
        var c2 = TABLE.indexOf(data.charAt(i + 1));
        buffer.put(c1 * 45 + c2, 11);
        i += 2;
      }
      if (i < data.length) buffer.put(TABLE.indexOf(data.charAt(i)), 6);
    },
    write8BitByte: function (buffer, data) {
      for (var i = 0; i < data.length; i++) {
        var c = data.charCodeAt(i);
        if (c < 0x80) buffer.put(c, 8);
        else if (c < 0x800) { buffer.put(0xc0 | (c >> 6), 8); buffer.put(0x80 | (c & 0x3f), 8); }
        else if (c < 0x10000) { buffer.put(0xe0 | (c >> 12), 8); buffer.put(0x80 | ((c >> 6) & 0x3f), 8); buffer.put(0x80 | (c & 0x3f), 8); }
        else { buffer.put(0xf0 | (c >> 18), 8); buffer.put(0x80 | ((c >> 12) & 0x3f), 8); buffer.put(0x80 | ((c >> 6) & 0x3f), 8); buffer.put(0x80 | (c & 0x3f), 8); }
      }
    },
    createData: function () {
      var buffer = new QRBitBuffer();
      for (var i = 0; i < this.dataList.length; i++) {
        var data = this.dataList[i];
        var mode = data.mode;
        buffer.put(mode, 4);
        buffer.put(data.data.length, QRUtil.getLengthInBits(mode, this.typeNumber));
        if (mode === QRMode.MODE_NUMBER) this.writeNumber(buffer, data.data);
        else if (mode === QRMode.MODE_ALPHA_NUM) this.writeAlphaNum(buffer, data.data);
        else if (mode === QRMode.MODE_8BIT_BYTE) this.write8BitByte(buffer, data.data);
      }
      var rsBlocks = QRRSBlock.getRSBlocks(this.typeNumber, this.errorCorrectLevel);
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
      if (buffer.getLengthInBits() > totalDataCount * 8) throw new Error('code length overflow');
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
      var PAD0 = 0xec, PAD1 = 0x11, padToggle = true;
      while (buffer.getLengthInBits() < totalDataCount * 8) { buffer.put(padToggle ? PAD0 : PAD1, 8); padToggle = !padToggle; }
      return this.createBytes(buffer, rsBlocks);
    },
    createBytes: function (buffer, rsBlocks) {
      var offset = 0, maxDcCount = 0, maxEcCount = 0;
      var dcdata = [], ecdata = [];
      for (var r = 0; r < rsBlocks.length; r++) {
        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;
        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);
        dcdata[r] = new Array(dcCount);
        for (var i = 0; i < dcCount; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
        offset += dcCount;
        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i++) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
        }
      }
      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
      var data = new Array(totalCodeCount);
      var index = 0;
      for (var i = 0; i < maxDcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < dcdata[r].length) data[index++] = dcdata[r][i];
      for (var i = 0; i < maxEcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < ecdata[r].length) data[index++] = ecdata[r][i];
      return data;
    },
    getBestMaskPattern: function () {
      var minLostPoint = 0, pattern = 0;
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lostPoint = QRUtil.getLostPoint(this);
        if (i === 0 || minLostPoint > lostPoint) { minLostPoint = lostPoint; pattern = i; }
      }
      return pattern;
    },
    mapData: function (data, maskPattern) {
      var inc = -1, row = this.moduleCount - 1, bitIndex = 7, byteIndex = 0;
      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] === null) {
              var dark = false;
              if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
              var mask = QRUtil.getMask(maskPattern, row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    },
    getModuleCount: function () { return this.moduleCount; },
    isDark: function (row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) throw new Error(row + ',' + col);
      return this.modules[row][col];
    }
  };

  // ============================================================
  // PartyQR 공개 API
  // ============================================================

  function toMatrix(text) {
    if (text === undefined || text === null || text === '') return [];
    var qr = new QRCode(undefined, QRErrorCorrectLevel.M);
    qr.addData(text);
    qr.make();
    var count = qr.getModuleCount();
    var matrix = new Array(count);
    for (var r = 0; r < count; r++) {
      matrix[r] = new Array(count);
      for (var c = 0; c < count; c++) matrix[r][c] = qr.isDark(r, c);
    }
    return matrix;
  }

  function toSVG(text, opts) {
    if (text === undefined || text === null || text === '') return '';
    opts = opts || {};
    var size = opts.size || 160;
    var margin = opts.margin !== undefined ? opts.margin : 4;
    var dark = opts.dark || '#047857';
    var light = opts.light || '#ffffff';

    var matrix = toMatrix(text);
    if (matrix.length === 0) return '';

    var moduleCount = matrix.length;
    var viewBoxSize = moduleCount + 2 * margin;

    var rects = [];
    for (var r = 0; r < moduleCount; r++) {
      for (var c = 0; c < moduleCount; c++) {
        if (matrix[r][c]) {
          var x = c + margin, y = r + margin;
          rects.push('<rect x="' + x + '" y="' + y + '" width="1" height="1" />');
        }
      }
    }

    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg"',
      '  viewBox="0 0 ' + viewBoxSize + ' ' + viewBoxSize + '"',
      '  width="' + size + '" height="' + size + '"',
      '  shape-rendering="crispEdges">',
      '  <rect width="100%" height="100%" fill="' + light + '" />',
      '  <g fill="' + dark + '">',
      rects.join(''),
      '  </g>',
      '</svg>'
    ].join('\n');

    return svg;
  }

  window.PartyQR = { toMatrix: toMatrix, toSVG: toSVG };
})();