# =============================================================================
# Imagen del "deployer": lo unico que hace falta para hablar con OCI.
#
# POR QUE EXISTE: desplegar necesita oci-cli (crear la sesion de Bastion) y un
# cliente SSH (el tunel y el comando remoto). Instalar oci-cli en Windows es un
# rato; meterlo en una imagen lo hace reproducible y desechable, y de paso el
# despliegue funciona igual desde Windows, Linux o macOS.
#
# Se construye sola desde desplegar.ps1 la primera vez.
# Para forzar que se rehaga (subir versiones):  podman rmi fv-deployer
# =============================================================================
FROM docker.io/library/python:3.12-slim

# openssh-client: el tunel al Bastion y el `ssh ... bash -s` del script remoto.
RUN apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends openssh-client \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -q oci-cli

# El bastion de OCI negocia con llaves RSA y OpenSSH 9 las rechaza por defecto
# (firma SHA-1). Los scripts pasan -o PubkeyAcceptedKeyTypes=+ssh-rsa en cada
# invocacion; esto lo deja tambien de base por si alguien entra a mano al
# contenedor a depurar.
RUN printf '%s\n' \
      'Host *' \
      '  PubkeyAcceptedKeyTypes +ssh-rsa' \
      '  PubkeyAcceptedAlgorithms +ssh-rsa' \
      '  HostKeyAlgorithms +ssh-rsa' \
    > /etc/ssh/ssh_config.d/10-oci-bastion.conf 2>/dev/null \
 || printf '%s\n' \
      'Host *' \
      '  PubkeyAcceptedKeyTypes +ssh-rsa' \
      '  PubkeyAcceptedAlgorithms +ssh-rsa' \
      '  HostKeyAlgorithms +ssh-rsa' \
    >> /etc/ssh/ssh_config

# Silencia el aviso de permisos de la llave API en cada comando de oci-cli.
ENV SUPPRESS_LABEL_WARNING=True

WORKDIR /fv
