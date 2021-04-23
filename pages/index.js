import { Layout, Page, Button, Card } from '@shopify/polaris';
import { useState } from 'react';
import store from 'store-js';
import Cookies from 'js-cookie';


const Index = () => {
    const [loading, setLoading] = useState(false);
    const handleButton = () => {
        setLoading(true);
        const res = fetch(`/reindex`, {
            method: 'GET'
        }).then(data => { 
            setLoading(false);
        });
    };
    return (
        <Page>
            <Layout>
                <Layout.Section>
                    <Card title="Author JSON Updater" sectioned>
                        <p>You should re-index your Author JSON after changing author blogs.</p>
                    </Card>
                </Layout.Section>
                <Layout.Section>
                    <Button
                        loading={loading}
                        primary={true}
                        size={"large"}
                        onClick={handleButton}
                    >Re-index</Button>
                </Layout.Section>
                
            </Layout>
        </Page>
    )
};

export default Index;