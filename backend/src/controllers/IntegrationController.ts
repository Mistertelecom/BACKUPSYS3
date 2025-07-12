import { Request, Response } from 'express';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface IPSecConfig {
  equipmentType: 'mikrotik' | 'cisco' | 'huawei' | 'pfsense' | 'fortigate';
  clientName: string;
  clientIP: string;
  clientNetwork: string;
  vpsIP: string;
  vpsNetwork: string;
  pskKey: string;
  encryption: 'aes128' | 'aes256';
  authentication: 'sha1' | 'sha256' | 'sha512';
  dhGroup: 'modp1024' | 'modp2048' | 'modp4096';
  pfsGroup: 'modp1024' | 'modp2048' | 'modp4096';
  ikeVersion: 'ikev1' | 'ikev2';
}

export class IntegrationController {
  static async getVPSInfo(req: Request, res: Response): Promise<void> {
    try {
      // Detectar IP público da VPS (IPv4)
      let vpsIP = '';
      
      try {
        // Tentar múltiplos serviços para detectar IP público IPv4
        const services = [
          'curl -s -4 --connect-timeout 5 ifconfig.me',
          'curl -s -4 --connect-timeout 5 icanhazip.com', 
          'curl -s -4 --connect-timeout 5 ipinfo.io/ip',
          'curl -s -4 --connect-timeout 5 checkip.amazonaws.com'
        ];
        
        for (const service of services) {
          try {
            const { stdout } = await execAsync(service);
            const ip = stdout.trim();
            // Verificar se é um IPv4 válido
            if (ip && ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
              vpsIP = ip;
              break;
            }
          } catch (serviceError) {
            continue; // Tentar próximo serviço
          }
        }
        
        // Fallback para IP local se não conseguir detectar IP público
        if (!vpsIP) {
          if (process.platform === 'win32') {
            const { stdout } = await execAsync('for /f "tokens=2 delims=:" %i in (\'ipconfig ^| findstr "IPv4"\') do @echo %i').catch(() => ({ stdout: '' }));
            vpsIP = stdout.trim();
          } else {
            const { stdout } = await execAsync("hostname -I | awk '{print $1}'").catch(() => ({ stdout: '' }));
            vpsIP = stdout.trim();
          }
        }
      } catch (error) {
        console.error('Erro ao detectar IP da VPS:', error);
        vpsIP = '0.0.0.0'; // IP placeholder
      }

      res.json({
        success: true,
        vpsIP,
        vpsNetwork: '10.100.0.0/24',
        serverInfo: {
          platform: process.platform,
          hostname: require('os').hostname(),
          uptime: process.uptime()
        }
      });
    } catch (error) {
      console.error('Erro ao obter informações da VPS:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao obter informações da VPS' 
      });
    }
  }

  static async generateConfig(req: Request, res: Response): Promise<void> {
    try {
      const config: IPSecConfig = req.body;
      
      // Validar dados obrigatórios
      if (!config.clientName || !config.clientNetwork || !config.pskKey) {
        res.status(400).json({
          success: false,
          error: 'Campos obrigatórios não preenchidos'
        });
        return;
      }

      // Detectar IP da VPS se necessário
      if (!config.vpsIP || config.vpsIP === 'auto-detect') {
        try {
          const { stdout: ip1 } = await execAsync('curl -s --connect-timeout 5 ifconfig.me || echo ""').catch(() => ({ stdout: '' }));
          const { stdout: ip2 } = await execAsync('curl -s --connect-timeout 5 icanhazip.com || echo ""').catch(() => ({ stdout: '' }));
          
          const detectedIP = (ip1 || ip2).trim();
          if (detectedIP && detectedIP.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            config.vpsIP = detectedIP;
            console.log(`IP da VPS detectado automaticamente: ${detectedIP}`);
          } else {
            config.vpsIP = '0.0.0.0'; // Placeholder se não conseguir detectar
            console.warn('Não foi possível detectar IP da VPS automaticamente');
          }
        } catch (error) {
          console.error('Erro ao detectar IP da VPS:', error);
          config.vpsIP = '0.0.0.0'; // Fallback
        }
      }

      let configuration = '';

      switch (config.equipmentType) {
        case 'mikrotik':
          configuration = IntegrationController.generateMikrotikConfig(config);
          break;
        case 'cisco':
          configuration = IntegrationController.generateCiscoConfig(config);
          break;
        case 'huawei':
          configuration = IntegrationController.generateHuaweiConfig(config);
          break;
        case 'pfsense':
          configuration = IntegrationController.generatePfSenseConfig(config);
          break;
        case 'fortigate':
          configuration = IntegrationController.generateFortiGateConfig(config);
          break;
        default:
          throw new Error('Tipo de equipamento não suportado');
      }

      res.json({
        success: true,
        configuration,
        equipmentType: config.equipmentType,
        clientName: config.clientName,
        detectedVpsIP: config.vpsIP,
        configUsed: {
          vpsIP: config.vpsIP,
          vpsNetwork: config.vpsNetwork,
          clientIP: config.clientIP,
          clientNetwork: config.clientNetwork,
          encryption: config.encryption,
          authentication: config.authentication
        }
      });
    } catch (error: any) {
      console.error('Erro ao gerar configuração:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao gerar configuração IPSec'
      });
    }
  }

  static async testConnectivity(req: Request, res: Response): Promise<void> {
    try {
      const { clientIP, clientNetwork, equipmentType } = req.body;

      if (!clientIP) {
        res.status(400).json({
          success: false,
          error: 'IP do cliente é obrigatório para o teste'
        });
        return;
      }

      const testResults = {
        ping: false,
        ipsecStatus: false,
        routeTest: false,
        details: [] as string[]
      };

      // Teste 1: Ping básico
      try {
        const pingCmd = process.platform === 'win32' 
          ? `ping -n 4 ${clientIP}` 
          : `ping -c 4 ${clientIP}`;
        
        const { stdout } = await execAsync(pingCmd);
        testResults.ping = !stdout.includes('unreachable') && !stdout.includes('timeout');
        testResults.details.push(`Ping: ${testResults.ping ? 'Sucesso' : 'Falha'}`);
      } catch (error) {
        testResults.details.push('Ping: Falha na execução');
      }

      // Teste 2: Status IPSec (Linux)
      if (process.platform === 'linux') {
        try {
          const { stdout } = await execAsync('ip xfrm state list');
          testResults.ipsecStatus = stdout.includes(clientIP);
          testResults.details.push(`IPSec: ${testResults.ipsecStatus ? 'Túnel ativo' : 'Túnel inativo'}`);
        } catch (error) {
          testResults.details.push('IPSec: Não foi possível verificar status');
        }
      } else {
        testResults.details.push('IPSec: Verificação disponível apenas no Linux');
      }

      // Teste 3: Teste de rota (se rede cliente informada)
      if (clientNetwork) {
        try {
          const networkIP = clientNetwork.split('/')[0];
          const routeCmd = process.platform === 'win32' 
            ? `ping -n 1 ${networkIP}` 
            : `ping -c 1 ${networkIP}`;
          
          const { stdout } = await execAsync(routeCmd);
          testResults.routeTest = !stdout.includes('unreachable');
          testResults.details.push(`Rede cliente: ${testResults.routeTest ? 'Acessível' : 'Inacessível'}`);
        } catch (error) {
          testResults.details.push('Rede cliente: Teste de rota falhou');
        }
      }

      const success = testResults.ping;
      const message = success 
        ? 'Conectividade básica estabelecida com sucesso!'
        : 'Problemas na conectividade detectados';

      res.json({
        success,
        message,
        details: testResults.details.join(' | '),
        testResults,
        recommendations: IntegrationController.getRecommendations(testResults, equipmentType)
      });
    } catch (error: any) {
      console.error('Erro no teste de conectividade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao executar teste de conectividade',
        details: error.message
      });
    }
  }

  private static generateMikrotikConfig(config: IPSecConfig): string {
    const encAlgorithm = config.encryption === 'aes256' ? 'aes-256-cbc' : 'aes-128-cbc';
    const authAlgorithm = config.authentication;
    const dhGroup = config.dhGroup.replace('modp', '');
    const pfsGroup = config.pfsGroup.replace('modp', '');
    const isDynamicIP = !config.clientIP || config.clientIP === 'dynamic';
    
    return `# Configuração IPSec para MikroTik RouterOS
# Cliente: ${config.clientName}
# Tipo: ${isDynamicIP ? 'IP Dinâmico/NAT (Road Warrior)' : 'IP Fixo (Site-to-Site)'}
# Gerado em: ${new Date().toLocaleString('pt-BR')}

# Limpar configurações IPSec existentes (se necessário)
/ip ipsec policy remove [find]
/ip ipsec peer remove [find]
/ip ipsec identity remove [find]
/ip ipsec proposal remove [find]

# Criar proposal IPSec
/ip ipsec proposal
add name="${config.clientName}-proposal" \\
    auth-algorithms=${authAlgorithm} \\
    enc-algorithms=${encAlgorithm} \\
    pfs-group=modp${pfsGroup}

# Criar profile IPSec
/ip ipsec profile
add name="${config.clientName}-profile" \\
    dh-group=modp${dhGroup} \\
    enc-algorithm=${config.encryption === 'aes256' ? 'aes-256' : 'aes-128'} \\
    hash-algorithm=${authAlgorithm} \\
    proposal-check=obey ${isDynamicIP ? '\\\n    nat-traversal=yes' : ''}

# Configurar peer${isDynamicIP ? ' (IP Dinâmico)' : ''}
/ip ipsec peer
add name="${config.clientName}-peer" \\
    ${isDynamicIP ? 'address=0.0.0.0/0' : `address=${config.vpsIP}/32`} \\
    profile=${config.clientName}-profile \\
    exchange-mode=${config.ikeVersion === 'ikev2' ? 'ike2' : 'main'}${isDynamicIP ? ' \\\n    passive=yes \\\n    send-initial-contact=no' : ''}

# Configurar identity
/ip ipsec identity
add peer=${config.clientName}-peer \\
    auth-method=pre-shared-key \\
    secret="${config.pskKey}" \\
    ${isDynamicIP ? 'policy-template-group=default' : 'generate-policy=port-strict'}

${isDynamicIP ? `# Configurar policy template (para clientes dinâmicos)
/ip ipsec policy group
add name="${config.clientName}-group"

/ip ipsec policy template
add name="${config.clientName}-template" \\
    group=${config.clientName}-group \\
    src-address=${config.clientNetwork} \\
    dst-address=${config.vpsNetwork} \\
    proposal=${config.clientName}-proposal \\
    level=require \\
    tunnel=yes` : `# Configurar policy (para IP fixo)
/ip ipsec policy
add src-address=${config.clientNetwork} \\
    dst-address=${config.vpsNetwork} \\
    peer=${config.clientName}-peer \\
    proposal=${config.clientName}-proposal \\
    level=require \\
    tunnel=yes`}

# Configurar firewall (permitir IPSec)
/ip firewall filter
add chain=input action=accept protocol=udp dst-port=500 ${isDynamicIP ? '' : `src-address=${config.vpsIP} `}comment="IPSec IKE"
add chain=input action=accept protocol=udp dst-port=4500 ${isDynamicIP ? '' : `src-address=${config.vpsIP} `}comment="IPSec NAT-T"
add chain=input action=accept protocol=ipsec-esp ${isDynamicIP ? '' : `src-address=${config.vpsIP} `}comment="IPSec ESP"

# Configurar NAT (se necessário)
/ip firewall nat
add chain=srcnat src-address=${config.clientNetwork} dst-address=${config.vpsNetwork} action=accept comment="IPSec no NAT"

${isDynamicIP ? `
# ATENÇÃO: Para clientes com IP dinâmico
# 1. O cliente iniciará a conexão
# 2. Configure DynDNS se necessário para facilitar reconexão
# 3. Considere usar mode-config para atribuir IPs automaticamente` : ''}

:log info "Configuração IPSec para ${config.clientName} aplicada com sucesso"
:put "Para verificar status: /ip ipsec active-peers print"
:put "Para verificar identities: /ip ipsec identity print"
:put "Para ver estatísticas: /ip ipsec statistics print"`;
  }

  private static generateCiscoConfig(config: IPSecConfig): string {
    const encAlgorithm = config.encryption === 'aes256' ? 'aes 256' : 'aes 128';
    const authAlgorithm = config.authentication === 'sha256' ? 'sha256' : config.authentication === 'sha512' ? 'sha512' : 'sha';
    const dhGroup = config.dhGroup.replace('modp', '');
    
    return `! Configuração IPSec para Cisco IOS
! Cliente: ${config.clientName}
! Gerado em: ${new Date().toLocaleString('pt-BR')}

! Configurar crypto ISAKMP policy
crypto isakmp policy 10
 encryption ${config.encryption === 'aes256' ? 'aes 256' : 'aes 128'}
 hash ${authAlgorithm}
 authentication pre-share
 group ${dhGroup}
 lifetime 28800

! Configurar pre-shared key
crypto isakmp key ${config.pskKey} address ${config.vpsIP}

! Configurar crypto IPSec transform-set
crypto ipsec transform-set ${config.clientName}-SET esp-${encAlgorithm} esp-${authAlgorithm}-hmac
 mode tunnel

! Configurar crypto map
crypto map ${config.clientName}-MAP 10 ipsec-isakmp
 set peer ${config.vpsIP}
 set transform-set ${config.clientName}-SET
 set pfs group${dhGroup}
 match address ${config.clientName}-ACL

! Configurar ACL para tráfego interessante
ip access-list extended ${config.clientName}-ACL
 permit ip ${config.clientNetwork.split('/')[0]} ${IntegrationController.getWildcardMask(config.clientNetwork)} ${config.vpsNetwork.split('/')[0]} ${IntegrationController.getWildcardMask(config.vpsNetwork)}

! Aplicar crypto map na interface externa
interface [INTERFACE_EXTERNA]
 crypto map ${config.clientName}-MAP

! Configurar rota para rede remota
ip route ${config.vpsNetwork.split('/')[0]} ${IntegrationController.getSubnetMask(config.vpsNetwork)} [GATEWAY_EXTERNO]

! Verificar status:
! show crypto isakmp sa
! show crypto ipsec sa
! show crypto map`;
  }

  private static generateHuaweiConfig(config: IPSecConfig): string {
    const encAlgorithm = config.encryption === 'aes256' ? 'aes-256' : 'aes-128';
    const authAlgorithm = config.authentication;
    const dhGroup = config.dhGroup.replace('modp', 'group');
    
    return `# Configuração IPSec para Huawei VRP
# Cliente: ${config.clientName}
# Gerado em: ${new Date().toLocaleString('pt-BR')}

# Configurar IKE proposal
ike proposal 10
 encryption-algorithm ${encAlgorithm}
 dh ${dhGroup}
 authentication-algorithm ${authAlgorithm}
 authentication-method pre-share
 integrity-algorithm ${authAlgorithm}
 prf ${authAlgorithm}

# Configurar IKE peer
ike peer ${config.clientName}-peer
 pre-shared-key cipher ${config.pskKey}
 ike-proposal 10
 remote-address ${config.vpsIP}
 ${config.ikeVersion === 'ikev2' ? 'version v2' : 'version v1'}

# Configurar IPSec proposal
ipsec proposal ${config.clientName}-proposal
 esp authentication-algorithm ${authAlgorithm}
 esp encryption-algorithm ${encAlgorithm}

# Configurar IPSec policy
ipsec policy ${config.clientName}-policy 10 isakmp
 proposal ${config.clientName}-proposal
 tunnel local ${config.clientNetwork.split('/')[0]}
 tunnel remote ${config.vpsNetwork.split('/')[0]}
 ike-peer ${config.clientName}-peer
 pfs dh-group${config.dhGroup.replace('modp', '')}

# Configurar ACL
acl number 3000
 rule 5 permit ip source ${config.clientNetwork} destination ${config.vpsNetwork}

# Aplicar na interface
interface [INTERFACE_EXTERNA]
 ipsec policy ${config.clientName}-policy

# Configurar rota
ip route-static ${config.vpsNetwork} [GATEWAY_EXTERNO]

# Verificar status:
# display ike sa
# display ipsec sa
# display ipsec statistics`;
  }

  private static generatePfSenseConfig(config: IPSecConfig): string {
    return `# Configuração IPSec para pfSense
# Cliente: ${config.clientName}
# Gerado em: ${new Date().toLocaleString('pt-BR')}

# Esta configuração deve ser aplicada via interface web do pfSense
# VPN > IPsec > Tunnels

# Phase 1 (IKE) Settings:
# - Interface: WAN
# - Remote Gateway: ${config.vpsIP}
# - Description: ${config.clientName} Tunnel
# - Authentication Method: Mutual PSK
# - Negotiation Mode: ${config.ikeVersion === 'ikev2' ? 'IKEv2' : 'Main'}
# - My Identifier: My IP Address
# - Peer Identifier: Peer IP Address
# - Pre-Shared Key: ${config.pskKey}
# - Encryption Algorithm: ${config.encryption === 'aes256' ? 'AES 256' : 'AES 128'}
# - Hash Algorithm: ${config.authentication.toUpperCase()}
# - DH Group: ${config.dhGroup.replace('modp', '')}
# - Lifetime: 28800

# Phase 2 (IPSec) Settings:
# - Mode: Tunnel IPv4
# - Local Network: ${config.clientNetwork}
# - Remote Network: ${config.vpsNetwork}
# - Protocol: ESP
# - Encryption Algorithm: ${config.encryption === 'aes256' ? 'AES 256' : 'AES 128'}
# - Hash Algorithm: ${config.authentication.toUpperCase()}
# - PFS Key Group: ${config.pfsGroup.replace('modp', '')}
# - Lifetime: 3600

# Firewall Rules (adicionar em Firewall > Rules > IPsec):
# - Action: Pass
# - Interface: IPsec
# - Protocol: Any
# - Source: ${config.vpsNetwork}
# - Destination: ${config.clientNetwork}

# Para verificar status:
# Status > IPsec > Overview
# Status > System Logs > IPsec`;
  }

  private static generateFortiGateConfig(config: IPSecConfig): string {
    const encAlgorithm = config.encryption === 'aes256' ? 'aes256' : 'aes128';
    const authAlgorithm = config.authentication;
    const dhGroup = config.dhGroup.replace('modp', '');
    
    return `# Configuração IPSec para FortiGate
# Cliente: ${config.clientName}
# Gerado em: ${new Date().toLocaleString('pt-BR')}

# Configurar Phase 1 interface
config vpn ipsec phase1-interface
    edit "${config.clientName}-p1"
        set interface "wan1"
        set peertype any
        set net-device disable
        set proposal ${config.encryption === 'aes256' ? 'aes256' : 'aes128'}-${authAlgorithm}
        set dhgrp ${dhGroup}
        set remote-gw ${config.vpsIP}
        set psksecret ${config.pskKey}
        ${config.ikeVersion === 'ikev2' ? 'set version 2' : 'set version 1'}
    next
end

# Configurar Phase 2 interface
config vpn ipsec phase2-interface
    edit "${config.clientName}-p2"
        set phase1name "${config.clientName}-p1"
        set proposal ${encAlgorithm}-${authAlgorithm}
        set dhgrp ${dhGroup}
        set src-subnet ${config.clientNetwork}
        set dst-subnet ${config.vpsNetwork}
    next
end

# Configurar política de firewall
config firewall policy
    edit 0
        set name "${config.clientName}-out"
        set srcintf "internal"
        set dstintf "${config.clientName}-p1"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
    next
    edit 0
        set name "${config.clientName}-in"
        set srcintf "${config.clientName}-p1"
        set dstintf "internal"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
    next
end

# Configurar rota estática
config router static
    edit 0
        set dst ${config.vpsNetwork}
        set device "${config.clientName}-p1"
    next
end

# Para verificar status:
# get vpn ipsec tunnel summary
# diagnose vpn ike gateway list
# diagnose vpn tunnel list`;
  }

  private static getWildcardMask(cidr: string): string {
    const [, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength);
    const wildcardBits = 32 - prefix;
    const wildcard = (0xFFFFFFFF >>> prefix) & 0xFFFFFFFF;
    
    return [
      (wildcard >>> 24) & 0xFF,
      (wildcard >>> 16) & 0xFF,
      (wildcard >>> 8) & 0xFF,
      wildcard & 0xFF
    ].join('.');
  }

  private static getSubnetMask(cidr: string): string {
    const [, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength);
    const mask = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF;
    
    return [
      (mask >>> 24) & 0xFF,
      (mask >>> 16) & 0xFF,
      (mask >>> 8) & 0xFF,
      mask & 0xFF
    ].join('.');
  }

  private static getRecommendations(testResults: any, equipmentType: string): string[] {
    const recommendations = [];

    if (!testResults.ping) {
      recommendations.push('Verificar conectividade de rede básica entre os endpoints');
      recommendations.push('Confirmar se o IP público está correto');
      recommendations.push('Verificar firewall/NAT no lado do cliente');
    }

    if (!testResults.ipsecStatus) {
      recommendations.push('Aplicar a configuração IPSec no equipamento cliente');
      recommendations.push('Verificar se as portas UDP 500 e 4500 estão abertas');
      recommendations.push('Confirmar se a PSK está correta em ambos os lados');
    }

    if (!testResults.routeTest) {
      recommendations.push('Verificar configuração de rotas para as redes remotas');
      recommendations.push('Confirmar que o tráfego está sendo tunelado pelo IPSec');
    }

    switch (equipmentType) {
      case 'mikrotik':
        recommendations.push('Usar /ip ipsec active-peers print para verificar status');
        break;
      case 'cisco':
        recommendations.push('Usar show crypto isakmp sa para verificar Phase 1');
        recommendations.push('Usar show crypto ipsec sa para verificar Phase 2');
        break;
      case 'huawei':
        recommendations.push('Usar display ike sa para verificar status IKE');
        break;
    }

    return recommendations;
  }
}