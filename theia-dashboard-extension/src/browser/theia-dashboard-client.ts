/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { EnvVariablesServer, EnvVariable } from '@theia/core/lib/common/env-variables';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { CheWorkspaceClientService } from './che-workspace-client-service';
import { IWorkspace } from '@eclipse-che/workspace-client';
import '../../src/browser/style/che-theia-dashboard-module.css';

const  logoId = 'theia:icon';

/**
 * Provides basic Eclipse Che Theia Dashboard client side feature at startup of the Theia browser IDE
 */
@injectable()
export class TheiaDashboardClient implements FrontendApplicationContribution {


    private isExpanded: boolean = false;

    constructor(@inject(EnvVariablesServer) private readonly envVariablesServer: EnvVariablesServer,
                @inject(CheWorkspaceClientService) private readonly cheWorkspaceClient: CheWorkspaceClientService,
                @inject(FrontendApplicationStateService) protected readonly frontendApplicationStateService: FrontendApplicationStateService) {
        this.frontendApplicationStateService.reachedState('ready').then(() => {
            this.onReady();
        });
    }

    async onStart(app: FrontendApplication): Promise<void> {
        // load this module at FrontendApplication startup
    }

    updateArrow(element: HTMLElement): void {
        element.innerHTML = `<i class="theia-dashboard fa fa-chevron-${this.isExpanded ?  'left' : 'right' }" 
                                title="${this.isExpanded ?  'Hide' : 'Show'} navigation bar" />`;
    }

    async onReady() {
        const logoElement: HTMLElement | null = document.getElementById(logoId);
        if (!logoElement) {
            return;
        }

        if (this.isInFrame()) {
            this.updateArrow(logoElement);
            logoElement.addEventListener('click', (event: MouseEvent) => {
                event.preventDefault();
                window.parent.postMessage(this.isExpanded ? 'show-navbar' : 'hide-navbar', '*');
                this.updateArrow(logoElement);
                this.isExpanded = !this.isExpanded;
            });
        } else {
            const href = await this.getDashboardWorkspaceUrl();
            logoElement.innerHTML = `<a class="theia-dashboard fa fa-chevron-left" href="${href}" target="_blank"
                                        title="Open with navigation bar"/></a>`;
        }
    }

    async getDashboardWorkspaceUrl(): Promise<string> {
        const defaultUrl = './';
        const envVariables: EnvVariable[] = await this.envVariablesServer.getVariables();
        if (!envVariables) {
            return defaultUrl;
        }
        const workspaceIdEnvVar = envVariables.find((envVariable) => {
            return envVariable.name === 'CHE_WORKSPACE_ID';
        });
        if (!workspaceIdEnvVar || !workspaceIdEnvVar.value) {
            return defaultUrl;
        }

        const workspaceId = workspaceIdEnvVar.value;

        const remoteApi = await this.cheWorkspaceClient.restClient();
        const workspace: IWorkspace = await remoteApi.getById<IWorkspace>(workspaceId);

        if (!workspace || !workspace.links|| !workspace.links.ide) {
            return defaultUrl;
        }
        const ideWorkspaceUrl = workspace!.links!.ide!;
        const dashboardWorkspaceUrl: string = (ideWorkspaceUrl).replace('/che/', '/dashboard/#/ide/che/');

        return  dashboardWorkspaceUrl;
    }


    /**
     * Determines whether the IDE is loaded inside frame.
     *
     * @return <b>true</b> if IDE is loaded in frame
     */
    private isInFrame(): boolean {
        return window !== window.parent;
    };

}
